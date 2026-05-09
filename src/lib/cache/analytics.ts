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

async function readCacheVersion(key: string): Promise<string> {
  try {
    return (await cacheGet<string>(key)) ?? CACHE_VERSION_FALLBACK;
  } catch (error) {
    logger.error("cache_version_read_failed", { error, key });
    return CACHE_VERSION_FALLBACK;
  }
}

async function readCachedValue<T>(key: string): Promise<T | null> {
  try {
    return await cacheGet<T>(key);
  } catch (error) {
    logger.error("cache_read_failed", { error, key });
    return null;
  }
}

async function writeCachedValue(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  try {
    await cacheSet(key, value, ttlSeconds);
  } catch (error) {
    logger.error("cache_write_failed", { error, key, ttlSeconds });
  }
}

export async function getCachedDashboardAnalyticsAggregates({
  from,
  loader = getDashboardAnalyticsAggregatesForUser,
  to,
  userId,
}: DashboardAnalyticsLoaderInput & {
  loader?: DashboardAnalyticsLoader;
}): Promise<DashboardAnalyticsAggregates> {
  const [userVersion, globalVersion] = await Promise.all([
    readCacheVersion(buildDashboardAnalyticsUserVersionKey(userId)),
    readCacheVersion(buildDashboardAnalyticsGlobalVersionKey()),
  ]);
  const cacheKey = buildDashboardAnalyticsCacheKey({
    from,
    globalVersion,
    to,
    userId,
    userVersion,
  });
  const cached = await readCachedValue<DashboardAnalyticsAggregates>(cacheKey);
  if (cached) return cached;

  const aggregates = await loader({ from, to, userId });
  await writeCachedValue(
    cacheKey,
    aggregates,
    CACHE_TTL_SECONDS.dashboardAnalyticsAggregates,
  );

  return aggregates;
}

export async function getCachedAdminSystemStats({
  loader = getSystemStats,
  now = new Date(),
}: {
  loader?: AdminAnalyticsLoader;
  now?: Date;
} = {}): Promise<AdminSystemStats> {
  const version = await readCacheVersion(buildAdminAnalyticsVersionKey());
  const cacheKey = buildAdminAnalyticsCacheKey({
    asOf: now,
    version,
    windowDays: ADMIN_ANALYTICS_WINDOW_DAYS,
  });
  const cached = await readCachedValue<AdminSystemStats>(cacheKey);
  if (cached) return cached;

  const stats = await loader(now);
  await writeCachedValue(
    cacheKey,
    stats,
    CACHE_TTL_SECONDS.adminAnalyticsAggregates,
  );

  return stats;
}
