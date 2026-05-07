import { describe, expect, it } from "vitest";
import {
  canUseCustomSlug,
  getApiEndpointRateLimit,
  getCampaignQuota,
  getLinkCreationRateLimit,
  getLinkPageQuota,
  getLinkQuota,
  getQrQuota,
  getSmartRuleQuota,
  exceedsSmartRuleQuota,
  hasReachedCampaignQuota,
  hasReachedLinkPageQuota,
  hasReachedLinkQuota,
  hasReachedQrQuota,
} from "../../src/lib/links/limits";

describe("link limits", () => {
  it("should expose plan quotas for link creation", () => {
    expect(getLinkQuota("FREE")).toBe(25);
    expect(getLinkQuota("PRO")).toBe(500);
    expect(getLinkQuota("BUSINESS")).toBe(Number.POSITIVE_INFINITY);
  });

  it("should expose plan quotas for Link Pages", () => {
    expect(getLinkPageQuota("FREE")).toBe(3);
    expect(getLinkPageQuota("PRO")).toBe(50);
    expect(getLinkPageQuota("BUSINESS")).toBe(Number.POSITIVE_INFINITY);
  });

  it("should expose plan quotas for Smart Rules", () => {
    expect(getSmartRuleQuota("FREE")).toBe(2);
    expect(getSmartRuleQuota("PRO")).toBe(5);
    expect(getSmartRuleQuota("BUSINESS")).toBe(Number.POSITIVE_INFINITY);
  });

  it("should expose plan quotas for Campaigns and QR codes", () => {
    expect(getCampaignQuota("FREE")).toBe(1);
    expect(getCampaignQuota("PRO")).toBe(10);
    expect(getCampaignQuota("BUSINESS")).toBe(Number.POSITIVE_INFINITY);
    expect(getQrQuota("FREE")).toBe(10);
    expect(getQrQuota("PRO")).toBe(100);
    expect(getQrQuota("BUSINESS")).toBe(500);
  });

  it("should identify when a plan has reached its link quota", () => {
    expect(hasReachedLinkQuota("FREE", 24)).toBe(false);
    expect(hasReachedLinkQuota("FREE", 25)).toBe(true);
    expect(hasReachedLinkQuota("PRO", 500)).toBe(true);
    expect(hasReachedLinkQuota("BUSINESS", 50_000)).toBe(false);
  });

  it("should identify when a plan has reached its Link Page quota", () => {
    expect(hasReachedLinkPageQuota("FREE", 2)).toBe(false);
    expect(hasReachedLinkPageQuota("FREE", 3)).toBe(true);
    expect(hasReachedLinkPageQuota("PRO", 50)).toBe(true);
    expect(hasReachedLinkPageQuota("BUSINESS", 50_000)).toBe(false);
  });

  it("should identify when a plan has reached Campaign and QR quotas", () => {
    expect(hasReachedCampaignQuota("FREE", 0)).toBe(false);
    expect(hasReachedCampaignQuota("FREE", 1)).toBe(true);
    expect(hasReachedCampaignQuota("PRO", 10)).toBe(true);
    expect(hasReachedCampaignQuota("BUSINESS", 50_000)).toBe(false);
    expect(hasReachedQrQuota("FREE", 9)).toBe(false);
    expect(hasReachedQrQuota("FREE", 10)).toBe(true);
    expect(hasReachedQrQuota("BUSINESS", 500)).toBe(true);
  });

  it("should identify Smart Rule quota overages", () => {
    expect(exceedsSmartRuleQuota("FREE", 2)).toBe(false);
    expect(exceedsSmartRuleQuota("FREE", 3)).toBe(true);
    expect(exceedsSmartRuleQuota("PRO", 6)).toBe(true);
    expect(exceedsSmartRuleQuota("BUSINESS", 50_000)).toBe(false);
  });

  it("should gate custom slugs by plan", () => {
    expect(canUseCustomSlug("FREE")).toBe(false);
    expect(canUseCustomSlug("PRO")).toBe(true);
    expect(canUseCustomSlug("BUSINESS")).toBe(true);
  });

  it("should expose tiered rate limits for link and API endpoints", () => {
    expect(getLinkCreationRateLimit("FREE")).toBe(10);
    expect(getLinkCreationRateLimit("PRO")).toBe(30);
    expect(getApiEndpointRateLimit("BUSINESS")).toBe(120);
  });
});
