import { describe, expect, it } from "vitest";
import {
  parseRedirectCacheWarmupLimit,
  REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT,
  REDIRECT_CACHE_WARMUP_MAX_LIMIT,
  warmRedirectCache,
} from "../../src/lib/links/cache-warming";
import { getRedirectCacheKey, type RedirectLink } from "../../src/lib/links/redirect";

function createRedirectLink(overrides: Partial<RedirectLink> = {}): RedirectLink {
  return {
    clickCount: 12,
    destinationUrl: "https://example.com/promo",
    expiresAt: null,
    hasLinkPage: false,
    id: "link-1",
    isActive: true,
    scheduledAt: null,
    slug: "promo",
    ...overrides,
  };
}

describe("redirect cache warming", () => {
  it("should parse a bounded cache warmup limit", () => {
    expect(parseRedirectCacheWarmupLimit(undefined)).toBe(
      REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT,
    );
    expect(parseRedirectCacheWarmupLimit("25")).toBe(25);
    expect(parseRedirectCacheWarmupLimit("0")).toBe(
      REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT,
    );
    expect(parseRedirectCacheWarmupLimit("not-a-number")).toBe(
      REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT,
    );
    expect(parseRedirectCacheWarmupLimit("25abc")).toBe(
      REDIRECT_CACHE_WARMUP_DEFAULT_LIMIT,
    );
    expect(parseRedirectCacheWarmupLimit("999999")).toBe(
      REDIRECT_CACHE_WARMUP_MAX_LIMIT,
    );
  });

  it("should warm available redirect links with redirect cache payloads", async () => {
    const writes: Array<{ key: string; ttl?: number; value: unknown }> = [];
    const link = createRedirectLink({
      expiresAt: new Date("2026-05-08T10:00:00.000Z"),
      scheduledAt: new Date("2026-05-06T10:00:00.000Z"),
    });

    const result = await warmRedirectCache([link], {
      cacheSetFn: async (key, value, ttl) => {
        writes.push({ key, ttl, value });
      },
      now: new Date("2026-05-07T10:00:00.000Z"),
      ttlSeconds: 60,
    });

    expect(result).toEqual({
      cached: 1,
      errors: 0,
      skipped: 0,
      total: 1,
      ttlSeconds: 60,
    });
    expect(writes).toEqual([
      {
        key: getRedirectCacheKey("promo"),
        ttl: 60,
        value: {
          destinationUrl: "https://example.com/promo",
          expiresAt: "2026-05-08T10:00:00.000Z",
          hasLinkPage: false,
          id: "link-1",
          isActive: true,
          scheduledAt: "2026-05-06T10:00:00.000Z",
          slug: "promo",
        },
      },
    ]);
  });

  it("should skip inactive expired and future scheduled redirect links", async () => {
    const writes: string[] = [];
    const now = new Date("2026-05-07T10:00:00.000Z");

    const result = await warmRedirectCache(
      [
        createRedirectLink({ isActive: false, slug: "inactive" }),
        createRedirectLink({
          expiresAt: new Date("2026-05-07T09:59:00.000Z"),
          slug: "expired",
        }),
        createRedirectLink({
          scheduledAt: new Date("2026-05-07T10:01:00.000Z"),
          slug: "future",
        }),
      ],
      {
        cacheSetFn: async (key) => {
          writes.push(key);
        },
        now,
      },
    );

    expect(result.cached).toBe(0);
    expect(result.skipped).toBe(3);
    expect(result.errors).toBe(0);
    expect(writes).toEqual([]);
  });

  it("should count cache write errors and continue warming", async () => {
    const result = await warmRedirectCache(
      [createRedirectLink({ slug: "one" }), createRedirectLink({ slug: "two" })],
      {
        cacheSetFn: async (key) => {
          if (key === getRedirectCacheKey("one")) {
            throw new Error("Redis unavailable");
          }
        },
      },
    );

    expect(result.cached).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.skipped).toBe(0);
  });
});
