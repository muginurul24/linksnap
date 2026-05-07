import { cacheSet } from "@/lib/redis";
import {
  getRedirectCacheKey,
  isRedirectLinkAvailable,
  REDIRECT_CACHE_TTL_SECONDS,
  toRedirectLinkCachePayload,
  type RedirectLink,
} from "@/lib/links/redirect";

export const REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT = 500;
export const REDIRECT_CACHE_WARMUP_MAX_LIMIT = 5000;

type CacheSetter = (key: string, value: unknown, ttl?: number) => Promise<void>;

export type RedirectCacheWarmupResult = {
  cached: number;
  errors: number;
  skipped: number;
  total: number;
  ttlSeconds: number;
};

export function parseRedirectCacheWarmupLimit(value: string | undefined): number {
  if (!value) return REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT;
  if (!/^\d+$/.test(value)) return REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT;

  const parsed = Number.parseInt(value, 10);
  if (parsed < 1) return REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT;

  return Math.min(parsed, REDIRECT_CACHE_WARMUP_MAX_LIMIT);
}

export async function warmRedirectCache(
  links: RedirectLink[],
  options: {
    cacheSetFn?: CacheSetter;
    now?: Date;
    ttlSeconds?: number;
  } = {},
): Promise<RedirectCacheWarmupResult> {
  const now = options.now ?? new Date();
  const ttlSeconds = options.ttlSeconds ?? REDIRECT_CACHE_TTL_SECONDS;
  const cacheSetFn = options.cacheSetFn ?? cacheSet;
  let cached = 0;
  let errors = 0;
  let skipped = 0;

  for (const link of links) {
    if (!isRedirectLinkAvailable(link, now)) {
      skipped += 1;
      continue;
    }

    try {
      await cacheSetFn(
        getRedirectCacheKey(link.slug),
        toRedirectLinkCachePayload(link),
        ttlSeconds,
      );
      cached += 1;
    } catch {
      errors += 1;
    }
  }

  return {
    cached,
    errors,
    skipped,
    total: links.length,
    ttlSeconds,
  };
}
