import { db } from "@/lib/db";
import { retryTransientDbQuery } from "@/lib/db/retry";
import { getRecentApiErrorCount } from "@/lib/observability/instrumentation";
import { logger } from "@/lib/observability/logger";
import { redis } from "@/lib/redis";

type HealthCheckStatus = "error" | "ok";
type HealthStatus = "degraded" | "ok";

export type HealthCheck = {
  latencyMs: number;
  message?: string;
  status: HealthCheckStatus;
};

export type HealthReport = {
  checks: {
    apiErrorsLastFiveMinutes: number;
    database: HealthCheck;
    redis: HealthCheck;
  };
  service: "linksnap";
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
};

const startedAt = Date.now();

function getLatencyMs(startedAtMs: number): number {
  return Math.max(0, Date.now() - startedAtMs);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown health check error.";
}

async function checkDatabase(): Promise<HealthCheck> {
  const started = Date.now();

  try {
    await retryTransientDbQuery(() =>
      db.query.users.findFirst({
        columns: { id: true },
      }),
    );

    return { latencyMs: getLatencyMs(started), status: "ok" };
  } catch (error) {
    logger.error("health_database_check_failed", { error });
    return {
      latencyMs: getLatencyMs(started),
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const started = Date.now();

  try {
    await redis.ping();
    return { latencyMs: getLatencyMs(started), status: "ok" };
  } catch (error) {
    logger.error("health_redis_check_failed", { error });
    return {
      latencyMs: getLatencyMs(started),
      message: getErrorMessage(error),
      status: "error",
    };
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const [database, redisCheck, apiErrorsLastFiveMinutes] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    getRecentApiErrorCount({ windowMinutes: 5 }),
  ]);
  const status: HealthStatus =
    database.status === "ok" && redisCheck.status === "ok" ? "ok" : "degraded";

  return {
    checks: {
      apiErrorsLastFiveMinutes,
      database,
      redis: redisCheck,
    },
    service: "linksnap",
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
  };
}
