import { persistRedirectClick, type RedirectClickInput } from "@/lib/analytics/click-logger";
import {
  incrementRedirectClickCount,
  isRedirectClickCountedEvent,
} from "@/lib/links/click-count-cache";
import { logger } from "@/lib/observability/logger";
import { redis } from "@/lib/redis";

export const REDIRECT_CLICK_QUEUE_KEY = "linksnap:click-events:redirect";
export const REDIRECT_CLICK_DEAD_LETTER_KEY =
  "linksnap:click-events:redirect:dead-letter";
export const REDIRECT_CLICK_QUEUE_MAX_LENGTH = 10_000;
export const REDIRECT_CLICK_QUEUE_PROCESS_LIMIT = 100;
const REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD = 0.05;
const REDIRECT_CLICK_QUEUE_TTL_SECONDS = 60 * 60; // 1 hour
const REDIRECT_CLICK_DEAD_LETTER_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

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

function parseRedirectClick(payload: unknown): RedirectClickInput {
  const parsed =
    typeof payload === "string" ? (JSON.parse(payload) as unknown) : payload;

  if (!isQueuedRedirectClick(parsed)) {
    throw new Error("Invalid redirect click queue payload.");
  }

  return parsed.input;
}

function isQueuedRedirectClick(payload: unknown): payload is QueuedRedirectClick {
  if (typeof payload !== "object" || !payload) return false;

  const candidate = payload as Partial<QueuedRedirectClick>;
  return candidate.version === 1 && typeof candidate.input === "object" && !!candidate.input;
}

export async function enqueueRedirectClick(
  input: RedirectClickInput,
): Promise<void> {
  await redis.rpush(REDIRECT_CLICK_QUEUE_KEY, serializeRedirectClick(input));
  await Promise.all([
    redis.ltrim(
      REDIRECT_CLICK_QUEUE_KEY,
      -REDIRECT_CLICK_QUEUE_MAX_LENGTH,
      -1,
    ),
    redis.expire(REDIRECT_CLICK_QUEUE_KEY, REDIRECT_CLICK_QUEUE_TTL_SECONDS),
  ]);
}

export async function recordRedirectClick(
  input: RedirectClickInput,
  options: {
    currentClickCount?: number;
  } = {},
): Promise<RedirectClickRecordResult> {
  // Redirects should stay fast: queue first, then fall back to direct
  // persistence only when Redis is unavailable.
  try {
    await enqueueRedirectClick(input);
    await incrementCountWhenNeeded(input, options.currentClickCount);
    return { status: "queued" };
  } catch (queueError) {
    logger.error("redirect_click_enqueue_failed", { error: queueError });
  }

  try {
    await persistRedirectClick(input);
    await incrementCountWhenNeeded(input, options.currentClickCount);
    return { status: "persisted" };
  } catch (persistError) {
    logger.error("redirect_click_persist_failed", { error: persistError });
    return { status: "failed" };
  }
}

async function incrementCountWhenNeeded(
  input: RedirectClickInput,
  currentClickCount?: number,
): Promise<void> {
  if (!isRedirectClickCountedEvent(input.eventType)) return;

  await incrementRedirectClickCount({
    currentClickCount,
    linkId: input.linkId,
  });
}

async function moveToDeadLetter(payload: unknown): Promise<void> {
  try {
    const deadLetterPayload =
      typeof payload === "string" ? payload : JSON.stringify(payload);
    await redis.rpush(REDIRECT_CLICK_DEAD_LETTER_KEY, deadLetterPayload);
    await redis.expire(
      REDIRECT_CLICK_DEAD_LETTER_KEY,
      REDIRECT_CLICK_DEAD_LETTER_TTL_SECONDS,
    );
  } catch (error) {
    logger.error("redirect_click_dead_letter_failed", { error });
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
    const payload = await redis.lpop<unknown>(REDIRECT_CLICK_QUEUE_KEY);
    if (payload === null || payload === undefined) break;

    try {
      await persistRedirectClick(parseRedirectClick(payload));
      processed += 1;
    } catch (error) {
      // Bad payloads or transient DB failures are retained for operator review
      // instead of being dropped from the queue path silently.
      deadLettered += 1;
      logger.error("redirect_click_queue_process_failed", { error });
      await moveToDeadLetter(payload);
    }
  }

  const attempted = deadLettered + processed;
  const failureRate = attempted === 0 ? 0 : deadLettered / attempted;
  if (failureRate > REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD) {
    logger.error("redirect_click_failure_rate_exceeded", {
      deadLettered,
      failureRate,
      processed,
      threshold: REDIRECT_CLICK_FAILURE_ALERT_THRESHOLD,
    });
  }

  return { deadLettered, processed };
}
