import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RedirectLink } from "@/lib/links/redirect";

const link: RedirectLink = {
  clickCount: 12,
  destinationUrl: "https://example.com",
  expiresAt: null,
  hasLinkPage: false,
  id: "link-1",
  isActive: true,
  scheduledAt: null,
  slug: "promo",
};

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheSetCalls: [] as Array<{ key: string; ttl: number; value: unknown }>,
  dbCalls: 0,
  dbLink: null as RedirectLink | null,
}));

vi.mock("@/lib/db/queries/links", () => ({
  findRedirectLinkBySlug: async () => {
    mockState.dbCalls += 1;
    return mockState.dbLink;
  },
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async <T>(key: string): Promise<T | null> =>
    (mockState.cache.get(key) as T | undefined) ?? null,
  cacheSet: async (key: string, value: unknown, ttl: number) => {
    mockState.cacheSetCalls.push({ key, ttl, value });
    mockState.cache.set(key, value);
  },
}));

import { getRedirectLink } from "@/lib/links/redirect-cache";
import {
  getRedirectCacheKey,
  REDIRECT_CACHE_TTL_SECONDS,
  toRedirectLinkCachePayload,
} from "@/lib/links/redirect";

describe("redirect cache", () => {
  beforeEach(() => {
    mockState.cache = new Map();
    mockState.cacheSetCalls = [];
    mockState.dbCalls = 0;
    mockState.dbLink = null;
  });

  it("should return cached redirect links without database lookup", async () => {
    mockState.cache.set(getRedirectCacheKey("promo"), toRedirectLinkCachePayload(link));

    await expect(getRedirectLink("promo")).resolves.toMatchObject({
      id: "link-1",
      slug: "promo",
    });
    expect(mockState.dbCalls).toBe(0);
  });

  it("should cache database redirect links", async () => {
    mockState.dbLink = link;

    await expect(getRedirectLink("promo")).resolves.toMatchObject({
      id: "link-1",
      slug: "promo",
    });
    expect(mockState.cacheSetCalls).toEqual([
      {
        key: getRedirectCacheKey("promo"),
        ttl: REDIRECT_CACHE_TTL_SECONDS,
        value: toRedirectLinkCachePayload(link),
      },
    ]);
  });
});
