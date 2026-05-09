import { logger } from "@/lib/observability/logger";
import { redis } from "@/lib/redis";

const API_ERROR_BUCKET_PREFIX = "linksnap:metrics:api-errors";
const TIMING_METRIC_PREFIX = "linksnap:metrics:timing:last";
const API_ERROR_BUCKET_TTL_SECONDS = 60 * 60;
const TIMING_METRIC_TTL_SECONDS = 60 * 60 * 24;

type MetricTagValue = boolean | null | number | string;

type ApiErrorMetricInput = {
  code: string;
  requestId: string;
  route: string;
  status: number;
  timestamp?: Date;
};

type TimingMetricInput = {
  durationMs: number;
  name: "click_queue.process" | "payment.create" | "redirect.resolve";
  requestId?: string;
  tags?: Record<string, MetricTagValue>;
  timestamp?: Date;
};

export type RecentErrorCountInput = {
  timestamp?: Date;
  windowMinutes?: number;
};

type MetricTimer = {
  elapsedMs: () => number;
};

function shouldWriteAsyncMetrics(): boolean {
  return (
    process.env.NODE_ENV !== "test" ||
    process.env.LINKSNAP_TEST_REDIS_METRICS === "true"
  );
}

function getMinuteBucket(timestamp: Date): number {
  return Math.floor(timestamp.getTime() / 60_000);
}

function getApiErrorBucketKey(bucket: number): string {
  return `${API_ERROR_BUCKET_PREFIX}:${bucket}`;
}

function getTimingMetricKey(name: TimingMetricInput["name"]): string {
  return `${TIMING_METRIC_PREFIX}:${name}`;
}

function normalizeRedisNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function createMetricTimer(): MetricTimer {
  const startedAt = performance.now();

  return {
    elapsedMs: () => Math.max(0, Math.round(performance.now() - startedAt)),
  };
}

export async function recordApiErrorMetric({
  code,
  requestId,
  route,
  status,
  timestamp = new Date(),
}: ApiErrorMetricInput): Promise<void> {
  const bucket = getMinuteBucket(timestamp);
  const key = getApiErrorBucketKey(bucket);

  try {
    await redis.incr(key);
    await redis.expire(key, API_ERROR_BUCKET_TTL_SECONDS);
  } catch (error) {
    logger.error("api_error_metric_write_failed", {
      code,
      error,
      requestId,
      route,
      status,
    });
  }
}

export function trackApiErrorMetric(input: ApiErrorMetricInput): void {
  if (!shouldWriteAsyncMetrics()) return;

  void recordApiErrorMetric(input);
}

export async function getRecentApiErrorCount({
  timestamp = new Date(),
  windowMinutes = 5,
}: RecentErrorCountInput = {}): Promise<number> {
  const boundedWindow = Math.max(1, Math.min(windowMinutes, 60));
  const currentBucket = getMinuteBucket(timestamp);
  const buckets = Array.from({ length: boundedWindow }, (_, index) =>
    getApiErrorBucketKey(currentBucket - index),
  );

  try {
    const values = await Promise.all(
      buckets.map((key) => redis.get<number | string>(key)),
    );

    return values.reduce<number>(
      (total, value) => total + normalizeRedisNumber(value),
      0,
    );
  } catch (error) {
    logger.error("api_error_metric_read_failed", { error, windowMinutes });
    return 0;
  }
}

export async function recordTimingMetric({
  durationMs,
  name,
  requestId,
  tags = {},
  timestamp = new Date(),
}: TimingMetricInput): Promise<void> {
  const payload = {
    durationMs,
    name,
    requestId,
    tags,
    timestamp: timestamp.toISOString(),
  };

  logger.info("timing_metric_recorded", payload);

  try {
    await redis.set(getTimingMetricKey(name), JSON.stringify(payload), {
      ex: TIMING_METRIC_TTL_SECONDS,
    });
  } catch (error) {
    logger.error("timing_metric_write_failed", { error, name, requestId });
  }
}

export function trackTimingMetric(input: TimingMetricInput): void {
  if (!shouldWriteAsyncMetrics()) return;

  void recordTimingMetric(input);
}
