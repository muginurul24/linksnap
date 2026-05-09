import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_CACHE_POLICIES,
  CACHE_POLICY_DOCUMENT_PATH,
  CACHE_TTL_SECONDS,
  DO_NOT_CACHE_POLICIES,
  EPHEMERAL_REDIS_POLICIES,
  FORBIDDEN_CACHE_HELPER_TERMS,
} from "@/lib/cache/policy";
import { GEO_IP_CACHE_TTL_SECONDS } from "@/lib/geo/geoip";
import { REDIRECT_CLICK_COUNT_TTL_SECONDS } from "@/lib/links/click-count-cache";
import { REDIRECT_CACHE_TTL_SECONDS } from "@/lib/links/redirect";
import { DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS } from "@/lib/payments/dashboard-subscription-cache";
import { QR_RENDER_CACHE_TTL_SECONDS } from "@/lib/qr/cache";
import { SMART_RULES_CACHE_TTL_SECONDS } from "@/lib/rules/rule-engine";

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    return stat.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

describe("cache policy", () => {
  it("should keep approved cache TTLs aligned with runtime constants", () => {
    expect(CACHE_TTL_SECONDS.redirectMetadata).toBe(REDIRECT_CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS.redirectClickCountSnapshot).toBe(
      REDIRECT_CLICK_COUNT_TTL_SECONDS,
    );
    expect(CACHE_TTL_SECONDS.smartRules).toBe(SMART_RULES_CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS.qrRenderPayload).toBe(QR_RENDER_CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS.geoIpLookup).toBe(GEO_IP_CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS.dashboardSubscriptionSnapshot).toBe(
      DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS,
    );
    expect(CACHE_TTL_SECONDS.dashboardAnalyticsAggregates).toBe(60);
    expect(CACHE_TTL_SECONDS.adminAnalyticsAggregates).toBe(30);
    expect(CACHE_TTL_SECONDS.publicMarketingContentHttp).toBe(3600);
  });

  it("should define TTL, scoping, invalidation, and stale tolerance for every approved cache", () => {
    for (const [key, policy] of Object.entries(APPROVED_CACHE_POLICIES)) {
      expect(policy.classification, key).toBe("cache");
      expect(policy.ttlSeconds, key).toBeGreaterThan(0);
      expect(policy.ttlSeconds, key).toBe(
        CACHE_TTL_SECONDS[key as keyof typeof CACHE_TTL_SECONDS],
      );
      expect(policy.keyPattern, key).toMatch(/linksnap:|HTTP:/);
      expect(policy.tenantScope, key).not.toHaveLength(0);
      expect(policy.invalidation, key).not.toHaveLength(0);
      expect(policy.staleTolerance, key).not.toHaveLength(0);
    }
  });

  it("should classify Redis ephemeral state separately from reusable caches", () => {
    expect(EPHEMERAL_REDIS_POLICIES.rateLimits.classification).toBe(
      "ephemeral_state",
    );
    expect(EPHEMERAL_REDIS_POLICIES.twoFactorChallenges.ttlSeconds).toBe(300);
    expect(EPHEMERAL_REDIS_POLICIES.pendingEmailChanges.ttlSeconds).toBe(600);
    expect(EPHEMERAL_REDIS_POLICIES.clickQueue.ttlSeconds).toBe(3600);
  });

  it("should document domains that must never be cached", () => {
    expect(DO_NOT_CACHE_POLICIES.authSessions.classification).toBe(
      "do_not_cache",
    );
    expect(DO_NOT_CACHE_POLICIES.superadminAuthorization.classification).toBe(
      "do_not_cache",
    );
    expect(DO_NOT_CACHE_POLICIES.csrfOriginDecisions.classification).toBe(
      "do_not_cache",
    );
    expect(DO_NOT_CACHE_POLICIES.paymentMutations.classification).toBe(
      "do_not_cache",
    );
    expect(DO_NOT_CACHE_POLICIES.rawAnalyticsEventLists.classification).toBe(
      "do_not_cache",
    );
  });

  it("should not add cache helper files for sensitive no-cache domains", () => {
    const sourceRoot = join(process.cwd(), "src", "lib");
    const cacheHelperFiles = listFiles(sourceRoot)
      .map((file) => relative(process.cwd(), file))
      .filter((file) => /cache/i.test(file))
      .filter((file) => file !== "src/lib/cache/policy.ts");
    const searchable = cacheHelperFiles.join("\n").toLowerCase();

    for (const term of FORBIDDEN_CACHE_HELPER_TERMS) {
      expect(searchable).not.toContain(term);
    }
  });

  it("should keep the planning artifact linked to the code policy", () => {
    const document = readFileSync(
      join(process.cwd(), CACHE_POLICY_DOCUMENT_PATH),
      "utf8",
    );

    expect(document).toContain("Approved Caches");
    expect(document).toContain("Redis As Ephemeral State, Not Cache");
    expect(document).toContain("Do Not Cache");
    expect(document).toContain("src/lib/cache/policy.ts");
  });
});
