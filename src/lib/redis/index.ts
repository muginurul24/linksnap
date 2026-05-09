import { Redis } from "@upstash/redis";
import { logger } from "@/lib/observability/logger";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

// Cache helpers
const CACHE_PREFIX = "linksnap:";
const CACHE_TTL = 3600; // 1 hour default

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redis.get<string | T>(CACHE_PREFIX + key);
    if (!data) return null;
    return typeof data === "string" ? (JSON.parse(data) as T) : data;
  } catch (error) {
    logger.error("redis_cache_get_failed", { error, key });
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl = CACHE_TTL,
): Promise<void> {
  try {
    await redis.set(CACHE_PREFIX + key, JSON.stringify(value), { ex: ttl });
  } catch (error) {
    logger.error("redis_cache_set_failed", { error, key, ttl });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(CACHE_PREFIX + key);
  } catch (error) {
    logger.error("redis_cache_delete_failed", { error, key });
  }
}
