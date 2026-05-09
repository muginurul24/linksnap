import {
  ADMIN_ANALYTICS_WINDOW_DAYS,
  getSystemStats,
  type AdminSystemStats,
} from "@/lib/db/queries/admin";
import {
  getDashboardAnalyticsAggregatesForUser,
  type DashboardAnalyticsAggregates,
} from "@/lib/db/queries/click-events";
import { cacheGet, cacheSet } from "@/lib/redis";
import { logger } from "@/lib/observability/logger";
import { CACHE_TTL_SECONDS } from "@/lib/cache/policy";
import {
  buildAdminAnalyticsCacheKey,
  buildAdminAnalyticsVersionKey,
  buildDashboardAnalyticsCacheKey,
  buildDashboardAnalyticsGlobalVersionKey,
  buildDashboardAnalyticsUserVersionKey,
  CACHE_VERSION_FALLBACK,
} from "@/lib/cache/keys";

type DashboardAnalyticsLoaderInput = {
  from: Date;
  to: Date;
  userId: string;
};

type DashboardAnalyticsLoader = (
  input: DashboardAnalyticsLoaderInput,
) => Promise<DashboardAnalyticsAggregates>;

type AdminAnalyticsLoader = (now?: Date) => Promise<AdminSystemStats>;

type CacheLogContext = {
  requestId?: string;
};

async function readCacheVersion(
  key: string,
  { requestId }: CacheLogContext = {},
): Promise<string> {
  try {
    return (await cacheGet<string>(key)) ?? CACHE_VERSION_FALLBACK;
  } catch (error) {
    logger.error("cache_version_read_failed", { error, key, requestId });
    return CACHE_VERSION_FALLBACK;
  }
}

async function readCachedValue<T>(
  key: string,
  { requestId }: CacheLogContext = {},
): Promise<T | null> {
  try {
    return await cacheGet<T>(key);
  } catch (error) {
    logger.error("cache_read_failed", { error, key, requestId });
    return null;
  }
}

async function writeCachedValue(
  key: string,
  value: unknown,
  ttlSeconds: number,
  { requestId }: CacheLogContext = {},
): Promise<void> {
  try {
    await cacheSet(key, value, ttlSeconds);
  } catch (error) {
    logger.error("cache_write_failed", { error, key, requestId, ttlSeconds });
  }
}

export async function getCachedDashboardAnalyticsAggregates({
  from,
  loader = getDashboardAnalyticsAggregatesForUser,
  requestId,
  to,
  userId,
}: DashboardAnalyticsLoaderInput & {
  loader?: DashboardAnalyticsLoader;
  requestId?: string;
}): Promise<DashboardAnalyticsAggregates> {
  const [userVersion, globalVersion] = await Promise.all([
    readCacheVersion(buildDashboardAnalyticsUserVersionKey(userId), {
      requestId,
    }),
    readCacheVersion(buildDashboardAnalyticsGlobalVersionKey(), { requestId }),
  ]);
  const cacheKey = buildDashboardAnalyticsCacheKey({
    from,
    globalVersion,
    to,
    userId,
    userVersion,
  });
  const cached = await readCachedValue<DashboardAnalyticsAggregates>(cacheKey, {
    requestId,
  });
  if (cached) return cached;

  const aggregates = await loader({ from, to, userId });
  await writeCachedValue(
    cacheKey,
    aggregates,
    CACHE_TTL_SECONDS.dashboardAnalyticsAggregates,
    { requestId },
  );

  return aggregates;
}

export async function getCachedAdminSystemStats({
  loader = getSystemStats,
  now = new Date(),
  requestId,
}: {
  loader?: AdminAnalyticsLoader;
  now?: Date;
  requestId?: string;
} = {}): Promise<AdminSystemStats> {
  const version = await readCacheVersion(buildAdminAnalyticsVersionKey(), {
    requestId,
  });
  const cacheKey = buildAdminAnalyticsCacheKey({
    asOf: now,
    version,
    windowDays: ADMIN_ANALYTICS_WINDOW_DAYS,
  });
  const cached = await readCachedValue<AdminSystemStats>(cacheKey, {
    requestId,
  });
  if (cached) return cached;

  const stats = await loader(now);
  await writeCachedValue(
    cacheKey,
    stats,
    CACHE_TTL_SECONDS.adminAnalyticsAggregates,
    { requestId },
  );

  return stats;
}
