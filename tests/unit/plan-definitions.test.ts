import { describe, expect, it } from "vitest";
import {
  PLAN_COMPARISON_ROWS,
  PLANS,
  formatUsdPrice,
  getPlanDefinition,
  getYearlySavings,
} from "../../src/lib/plans/definitions";
import {
  getApiEndpointRateLimit,
  getCampaignQuota,
  getLinkPageQuota,
  getLinkQuota,
  getQrQuota,
  getSmartRuleQuota,
  type UserPlan,
} from "../../src/lib/links/limits";

const expectedPlans: UserPlan[] = ["FREE", "PRO", "BUSINESS"];

describe("plan definitions", () => {
  it("should expose one complete definition for every user plan", () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(expectedPlans);

    for (const plan of PLANS) {
      expect(plan.name).toBeTruthy();
      expect(plan.description).toBeTruthy();
      expect(plan.cta).toBeTruthy();
      expect(plan.features.length).toBeGreaterThanOrEqual(6);
      expect(plan.monthlyUsd).toBeGreaterThanOrEqual(0);
      expect(plan.yearlyUsd).toBeGreaterThanOrEqual(0);
    }
  });

  it("should match plan limits to limits helpers", () => {
    for (const plan of PLANS) {
      expect(plan.limits).toMatchObject({
        apiRequestsPerMinute: getApiEndpointRateLimit(plan.id),
        campaigns: getCampaignQuota(plan.id),
        linkPages: getLinkPageQuota(plan.id),
        links: getLinkQuota(plan.id),
        qrCodes: getQrQuota(plan.id),
        smartRulesPerLink: getSmartRuleQuota(plan.id),
      });
    }
  });

  it("should include comparison rows for quota-backed features", () => {
    expect(PLAN_COMPARISON_ROWS.map((row) => row.feature)).toEqual([
      "Short links",
      "Link Pages",
      "Smart Rules per link",
      "QR codes",
      "Campaign groups",
      "Analytics retention",
      "A/B split testing",
      "API rate limit",
      "Webhook callbacks",
    ]);
  });

  it("should format pricing and yearly savings consistently", () => {
    expect(formatUsdPrice(0)).toBe("$0");
    expect(formatUsdPrice(8)).toBe("$8");
    expect(getYearlySavings(getPlanDefinition("PRO"))).toBe(21);
    expect(getYearlySavings(getPlanDefinition("BUSINESS"))).toBe(48);
  });
});
