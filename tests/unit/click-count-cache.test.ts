import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  countById: new Map<string, number>(),
  expireCalls: [] as Array<{ key: string; ttl: number }>,
  redis: new Map<string, unknown>(),
  setCalls: [] as Array<{ key: string; options?: unknown; value: unknown }>,
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  countRedirectClicksByLinkId: async (linkId: string) =>
    mockState.countById.get(linkId) ?? 0,
  countRedirectClicksByLinkIds: async (linkIds: string[]) =>
    new Map(linkIds.map((linkId) => [linkId, mockState.countById.get(linkId) ?? 0])),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    expire: async (key: string, ttl: number) => {
      mockState.expireCalls.push({ key, ttl });
    },
    get: async (key: string) => mockState.redis.get(key) ?? null,
    incr: async (key: string) => {
      const next = Number(mockState.redis.get(key) ?? 0) + 1;
      mockState.redis.set(key, next);
      return next;
    },
    set: async (key: string, value: unknown, options?: { nx?: boolean }) => {
      mockState.setCalls.push({ key, options, value });
      if (options?.nx && mockState.redis.has(key)) return null;

      mockState.redis.set(key, value);
      return "OK";
    },
  },
}));

import {
  getRedirectClickCount,
  getRedirectClickCountCacheKey,
  getRedirectClickCountWithFallback,
  hydrateRedirectClickCounts,
  incrementRedirectClickCount,
  isRedirectClickCountedEvent,
  REDIRECT_CLICK_COUNT_TTL_SECONDS,
} from "@/lib/links/click-count-cache";

describe("redirect click count cache", () => {
  beforeEach(() => {
    mockState.countById = new Map();
    mockState.expireCalls = [];
    mockState.redis = new Map();
    mockState.setCalls = [];
  });

  it("should read click count from Redis before falling back to DB count", async () => {
    const key = getRedirectClickCountCacheKey("link-1");
    mockState.redis.set(key, 9);
    mockState.countById.set("link-1", 42);

    await expect(getRedirectClickCount("link-1")).resolves.toBe(9);
    expect(mockState.setCalls).toEqual([]);
  });

  it("should cache DB fallback click counts for sixty seconds", async () => {
    mockState.countById.set("link-1", 42);

    await expect(getRedirectClickCount("link-1")).resolves.toBe(42);
    expect(mockState.setCalls).toEqual([
      {
        key: getRedirectClickCountCacheKey("link-1"),
        options: { ex: REDIRECT_CLICK_COUNT_TTL_SECONDS },
        value: 42,
      },
    ]);
  });

  it("should preserve a higher stored link count when event aggregation is lower", async () => {
    mockState.countById.set("link-1", 3);

    await expect(
      getRedirectClickCountWithFallback({
        fallbackClickCount: 42,
        linkId: "link-1",
      }),
    ).resolves.toBe(42);
  });

  it("should hydrate listed links with cached counts and DB fallback counts", async () => {
    mockState.redis.set(getRedirectClickCountCacheKey("link-1"), 8);
    mockState.countById.set("link-2", 21);

    await expect(
      hydrateRedirectClickCounts([
        { clickCount: 1, id: "link-1", slug: "one" },
        { clickCount: 2, id: "link-2", slug: "two" },
      ]),
    ).resolves.toEqual([
      { clickCount: 8, id: "link-1", slug: "one" },
      { clickCount: 21, id: "link-2", slug: "two" },
    ]);
  });

  it("should increment counted redirect click events from the current count", async () => {
    await expect(
      incrementRedirectClickCount({
        currentClickCount: 42,
        linkId: "link-1",
      }),
    ).resolves.toBe(43);

    expect(mockState.redis.get(getRedirectClickCountCacheKey("link-1"))).toBe(43);
    expect(mockState.expireCalls).toEqual([
      {
        key: getRedirectClickCountCacheKey("link-1"),
        ttl: REDIRECT_CLICK_COUNT_TTL_SECONDS,
      },
    ]);
  });

  it("should only count redirect and CTA events", () => {
    expect(isRedirectClickCountedEvent("DIRECT_REDIRECT")).toBe(true);
    expect(isRedirectClickCountedEvent("LINK_PAGE_CTA_CLICK")).toBe(true);
    expect(isRedirectClickCountedEvent("LINK_PAGE_VIEW")).toBe(false);
  });
});
