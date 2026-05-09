import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardAnalyticsAggregates } from "@/lib/db/queries/click-events";
import type { AdminSystemStats } from "@/lib/db/queries/admin";

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheDeleteCalls: [] as string[],
  cacheSetCalls: [] as Array<{ key: string; ttl: number; value: unknown }>,
  loggerErrors: [] as Array<{ context?: Record<string, unknown>; message: string }>,
  throwOnDelete: false,
  throwOnGet: false,
  throwOnSet: false,
}));

vi.mock("@/lib/db/queries/admin", () => ({
  ADMIN_ANALYTICS_WINDOW_DAYS: 30,
  getSystemStats: vi.fn(),
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  getDashboardAnalyticsAggregatesForUser: vi.fn(),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: {
    error: (message: string, context?: Record<string, unknown>) => {
      mockState.loggerErrors.push({ context, message });
    },
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    if (mockState.throwOnDelete) throw new Error("redis delete failed");
    mockState.cacheDeleteCalls.push(key);
    mockState.cache.delete(key);
  },
  cacheGet: async <T>(key: string): Promise<T | null> => {
    if (mockState.throwOnGet) throw new Error("redis get failed");
    return (mockState.cache.get(key) as T | undefined) ?? null;
  },
  cacheSet: async (key: string, value: unknown, ttl: number) => {
    if (mockState.throwOnSet) throw new Error("redis set failed");
    mockState.cacheSetCalls.push({ key, ttl, value });
    mockState.cache.set(key, value);
  },
}));

import {
  getCachedAdminSystemStats,
  getCachedDashboardAnalyticsAggregates,
} from "@/lib/cache/analytics";
import {
  buildAdminAnalyticsCacheKey,
  buildDashboardAnalyticsCacheKey,
  buildDashboardAnalyticsGlobalVersionKey,
  buildDashboardAnalyticsUserVersionKey,
  buildDashboardSubscriptionCacheKey,
  buildSmartRulesCacheKey,
} from "@/lib/cache/keys";
import {
  invalidateAdminPlanOverrideCaches,
  invalidateClickQueueProcessingCaches,
  invalidateLinkMutationCaches,
  invalidateSmartRuleCaches,
} from "@/lib/cache/invalidation";

function buildAggregates(): DashboardAnalyticsAggregates {
  return {
    browserBreakdown: [],
    clicksPerDay: [{ date: "2026-05-08", totalClicks: 3 }],
    deviceBreakdown: [],
    summary: {
      countdownCtaClicks: 0,
      countdownViews: 0,
      ctaClicks: 0,
      directRedirects: 3,
      pageViews: 0,
      totalClicks: 3,
      uniqueVisitors: 2,
      withoutCountdownCtaClicks: 0,
      withoutCountdownViews: 0,
    },
    topCities: [],
    topCountries: [],
    topLinks: [],
    topReferrers: [],
  };
}

function buildAdminStats(): AdminSystemStats {
  return {
    activeUsers: 1,
    adminActionsLast30Days: 0,
    clicksLast30Days: 3,
    failedPaymentsLast30Days: 0,
    growthTrend: [],
    lastUpdatedAt: "2026-05-08T00:00:00.000Z",
    linksLast30Days: 1,
    pendingPayments: 0,
    planDistribution: { BUSINESS: 0, FREE: 1, PRO: 0 },
    recentAdminActions: [],
    settledRevenueIdr: 0,
    topUsersByClicks: [],
    topUsersByLinks: [],
    totalClicks: 3,
    totalLinks: 1,
    totalRevenueIdr: 0,
    totalUsers: 1,
    usersLast30Days: 1,
  };
}

describe("cache helpers", () => {
  beforeEach(() => {
    mockState.cache = new Map();
    mockState.cacheDeleteCalls = [];
    mockState.cacheSetCalls = [];
    mockState.loggerErrors = [];
    mockState.throwOnDelete = false;
    mockState.throwOnGet = false;
    mockState.throwOnSet = false;
  });

  it("should build typed analytics keys from scoped, sanitized segments", () => {
    expect(buildDashboardAnalyticsCacheKey({
      from: new Date("2026-05-01T10:30:00.000Z"),
      globalVersion: "global_2",
      to: new Date("2026-05-08T23:59:59.999Z"),
      userId: "user-1",
      userVersion: "user_1",
    })).toBe("analytics:dashboard:user-1:2026-05-01:2026-05-08:uuser_1:gglobal_2:v1");
    expect(buildAdminAnalyticsCacheKey({
      asOf: new Date("2026-05-08T13:00:00.000Z"),
      version: "admin_1",
      windowDays: 30,
    })).toBe("analytics:admin:window-30:2026-05-08:vadmin_1:v1");
    expect(buildDashboardSubscriptionCacheKey("user-1")).toBe(
      "dashboard:subscription:user-1",
    );
    expect(buildSmartRulesCacheKey("promo-link")).toBe(
      "smart-rules:promo-link",
    );
    expect(() =>
      buildDashboardAnalyticsUserVersionKey("user@example.com"),
    ).toThrow("Invalid user ID cache key segment.");
  });

  it("should cache dashboard analytics on miss and return cached data on hit", async () => {
    const from = new Date("2026-05-01T00:00:00.000Z");
    const to = new Date("2026-05-08T23:59:59.999Z");
    const fresh = buildAggregates();
    const loader = vi.fn(async () => fresh);

    await expect(getCachedDashboardAnalyticsAggregates({
      from,
      loader,
      to,
      userId: "user-1",
    })).resolves.toBe(fresh);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockState.cacheSetCalls).toContainEqual({
      key: "analytics:dashboard:user-1:2026-05-01:2026-05-08:u1:g1:v1",
      ttl: 60,
      value: fresh,
    });

    loader.mockClear();
    await expect(getCachedDashboardAnalyticsAggregates({
      from,
      loader,
      to,
      userId: "user-1",
    })).resolves.toBe(fresh);
    expect(loader).not.toHaveBeenCalled();
  });

  it("should cache admin analytics separately from dashboard user scopes", async () => {
    const now = new Date("2026-05-08T13:00:00.000Z");
    const fresh = buildAdminStats();
    const loader = vi.fn(async () => fresh);

    await expect(getCachedAdminSystemStats({ loader, now })).resolves.toBe(fresh);
    expect(mockState.cacheSetCalls).toContainEqual({
      key: "analytics:admin:window-30:2026-05-08:v1:v1",
      ttl: 30,
      value: fresh,
    });

    loader.mockClear();
    await expect(getCachedAdminSystemStats({ loader, now })).resolves.toBe(fresh);
    expect(loader).not.toHaveBeenCalled();
  });

  it("should fall back to fresh analytics when Redis reads fail", async () => {
    mockState.throwOnGet = true;
    const fresh = buildAggregates();
    const loader = vi.fn(async () => fresh);

    await expect(getCachedDashboardAnalyticsAggregates({
      from: new Date("2026-05-01T00:00:00.000Z"),
      loader,
      to: new Date("2026-05-08T23:59:59.999Z"),
      userId: "user-1",
    })).resolves.toBe(fresh);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(mockState.loggerErrors.map((entry) => entry.message)).toContain(
      "cache_version_read_failed",
    );
    expect(mockState.loggerErrors.map((entry) => entry.message)).toContain(
      "cache_read_failed",
    );
  });

  it("should invalidate link, smart-rule, click-queue, and admin-plan caches", async () => {
    await invalidateLinkMutationCaches({
      reason: "link_update",
      slugs: ["promo", "promo"],
      userId: "user-1",
    });
    await invalidateSmartRuleCaches({
      reason: "smart_rules_update",
      slugs: ["promo"],
      userId: "user-1",
    });
    await invalidateClickQueueProcessingCaches({
      processed: 2,
      reason: "click_queue_processing",
    });
    await invalidateAdminPlanOverrideCaches({
      reason: "admin_plan_override",
      userId: "user-1",
    });

    expect(mockState.cacheDeleteCalls).toEqual([
      "redirect:promo",
      "redirect:promo",
      "smart-rules:promo",
      "dashboard:subscription:user-1",
    ]);
    expect(mockState.cacheSetCalls.map((call) => call.key)).toEqual([
      buildDashboardAnalyticsUserVersionKey("user-1"),
      "analytics:admin:version",
      buildDashboardAnalyticsUserVersionKey("user-1"),
      "analytics:admin:version",
      buildDashboardAnalyticsGlobalVersionKey(),
      "analytics:admin:version",
      buildDashboardAnalyticsUserVersionKey("user-1"),
      "analytics:admin:version",
    ]);
  });

  it("should keep invalidation non-fatal when Redis writes fail", async () => {
    mockState.throwOnSet = true;

    await expect(invalidateLinkMutationCaches({
      reason: "link_update",
      slugs: ["promo"],
      userId: "user-1",
    })).resolves.toBeUndefined();

    expect(mockState.cacheDeleteCalls).toEqual(["redirect:promo"]);
    expect(mockState.loggerErrors.map((entry) => entry.message)).toContain(
      "cache_invalidation_version_write_failed",
    );
  });
});
