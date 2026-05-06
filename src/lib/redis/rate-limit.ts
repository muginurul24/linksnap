import { redis } from "@/lib/redis";

type SlidingWindowOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

const RATE_LIMIT_PREFIX = "rate-limit:";

export async function slidingWindowRateLimit({
  key,
  limit,
  windowSeconds,
}: SlidingWindowOptions): Promise<RateLimitResult> {
  const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  try {
    await redis.zremrangebyscore(redisKey, 0, now - windowMs);
    const count = await redis.zcard(redisKey);

    if (count >= limit) {
      return { limited: true, retryAfter: windowSeconds };
    }

    await redis.zadd(redisKey, {
      score: now,
      member: `${now}:${crypto.randomUUID()}`,
    });
    await redis.expire(redisKey, windowSeconds);

    return { limited: false, remaining: Math.max(0, limit - count - 1) };
  } catch (error) {
    console.error("[rate-limit]", error);
    return { limited: false, remaining: 0 };
  }
}
