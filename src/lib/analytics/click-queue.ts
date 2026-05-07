import { persistRedirectClick, type RedirectClickInput } from "@/lib/analytics/click-logger";
import { redis } from "@/lib/redis";

export const REDIRECT_CLICK_QUEUE_KEY = "linksnap:click-events:redirect";
export const REDIRECT_CLICK_DEAD_LETTER_KEY =
  "linksnap:click-events:redirect:dead-letter";
export const REDIRECT_CLICK_QUEUE_MAX_LENGTH = 10_000;
export const REDIRECT_CLICK_QUEUE_PROCESS_LIMIT = 100;
const REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD = 0.05;

type QueuedRedirectClick = {
  enqueuedAt: string;
  input: RedirectClickInput;
  version: 1;
};

export type RedirectClickRecordResult =
  | { status: "failed" }
  | { status: "persisted" }
  | { status: "queued" };

export type RedirectClickQueueProcessResult = {
  deadLettered: number;
  processed: number;
};

function serializeRedirectClick(input: RedirectClickInput): string {
  return JSON.stringify({
    enqueuedAt: new Date().toISOString(),
    input,
    version: 1,
  } satisfies QueuedRedirectClick);
}

function parseRedirectClick(payload: string): RedirectClickInput {
  const parsed = JSON.parse(payload) as Partial<QueuedRedirectClick>;
  if (parsed.version !== 1 || typeof parsed.input !== "object" || !parsed.input) {
    throw new Error("Invalid redirect click queue payload.");
  }

  return parsed.input as RedirectClickInput;
}

export async function enqueueRedirectClick(
  input: RedirectClickInput,
): Promise<void> {
  await redis.rpush(REDIRECT_CLICK_QUEUE_KEY, serializeRedirectClick(input));
  await redis.ltrim(
    REDIRECT_CLICK_QUEUE_KEY,
    -REDIRECT_CLICK_QUEUE_MAX_LENGTH,
    -1,
  );
}

export async function recordRedirectClick(
  input: RedirectClickInput,
): Promise<RedirectClickRecordResult> {
  try {
    await enqueueRedirectClick(input);
    return { status: "queued" };
  } catch (queueError) {
    console.error("[click-queue] failed to enqueue redirect click", queueError);
  }

  try {
    await persistRedirectClick(input);
    return { status: "persisted" };
  } catch (persistError) {
    console.error("[click-queue] failed to persist redirect click", persistError);
    return { status: "failed" };
  }
}

async function moveToDeadLetter(payload: string): Promise<void> {
  try {
    await redis.rpush(REDIRECT_CLICK_DEAD_LETTER_KEY, payload);
  } catch (error) {
    console.error("[click-queue] failed to dead-letter redirect click", error);
  }
}

export async function processRedirectClickQueue({
  limit = REDIRECT_CLICK_QUEUE_PROCESS_LIMIT,
}: {
  limit?: number;
} = {}): Promise<RedirectClickQueueProcessResult> {
  const boundedLimit = Math.max(1, Math.min(limit, 500));
  let deadLettered = 0;
  let processed = 0;

  for (let index = 0; index < boundedLimit; index += 1) {
    const payload = await redis.lpop<string>(REDIRECT_CLICK_QUEUE_KEY);
    if (!payload) break;

    try {
      await persistRedirectClick(parseRedirectClick(payload));
      processed += 1;
    } catch (error) {
      deadLettered += 1;
      console.error("[click-queue] failed to process redirect click", error);
      await moveToDeadLetter(payload);
    }
  }

  const attempted = deadLettered + processed;
  const failureRate = attempted === 0 ? 0 : deadLettered / attempted;
  if (failureRate > REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD) {
    console.error("[click-queue] redirect click failure rate exceeded threshold", {
      deadLettered,
      failureRate,
      processed,
      threshold: REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD,
    });
  }

  return { deadLettered, processed };
}
