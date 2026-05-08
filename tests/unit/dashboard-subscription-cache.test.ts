import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPlan } from "@/lib/links/limits";

const mockState = vi.hoisted(() => ({
  billingCalls: 0,
  billingUser: {
    email: "pro@example.com",
    name: "Pro User",
    plan: "PRO" as UserPlan,
  } as { email: string; name: string | null; plan: UserPlan } | null,
  cache: new Map<string, unknown>(),
  cacheSetCalls: [] as Array<{ key: string; ttl: number; value: unknown }>,
  syncCalls: 0,
  syncPlan: "FREE" as UserPlan,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () => {
    mockState.billingCalls += 1;
    return mockState.billingUser;
  },
}));

vi.mock("@/lib/payments/subscription", () => ({
  syncSubscriptionStatusForUser: async () => {
    mockState.syncCalls += 1;
    return {
      expired: false,
      plan: mockState.syncPlan,
      subscription: null,
    };
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

import {
  DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS,
  getDashboardSubscriptionCacheKey,
  getDashboardSubscriptionSnapshot,
} from "@/lib/payments/dashboard-subscription-cache";

describe("dashboard subscription cache", () => {
  beforeEach(() => {
    mockState.billingCalls = 0;
    mockState.billingUser = {
      email: "pro@example.com",
      name: "Pro User",
      plan: "PRO",
    };
    mockState.cache = new Map();
    mockState.cacheSetCalls = [];
    mockState.syncCalls = 0;
    mockState.syncPlan = "FREE";
  });

  it("should return cached subscription snapshot without querying DB", async () => {
    mockState.cache.set(getDashboardSubscriptionCacheKey("user-1"), {
      email: "cached@example.com",
      name: "Cached User",
      plan: "BUSINESS",
    });

    await expect(getDashboardSubscriptionSnapshot("user-1")).resolves.toEqual({
      email: "cached@example.com",
      name: "Cached User",
      plan: "BUSINESS",
    });
    expect(mockState.syncCalls).toBe(0);
    expect(mockState.billingCalls).toBe(0);
  });

  it("should cache synced billing snapshot for sixty seconds", async () => {
    await expect(getDashboardSubscriptionSnapshot("user-1")).resolves.toEqual({
      email: "pro@example.com",
      name: "Pro User",
      plan: "PRO",
    });
    expect(mockState.syncCalls).toBe(1);
    expect(mockState.billingCalls).toBe(1);
    expect(mockState.cacheSetCalls).toEqual([
      {
        key: getDashboardSubscriptionCacheKey("user-1"),
        ttl: DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS,
        value: {
          email: "pro@example.com",
          name: "Pro User",
          plan: "PRO",
        },
      },
    ]);
  });
});
