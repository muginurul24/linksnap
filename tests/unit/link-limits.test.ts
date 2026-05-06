import { describe, expect, it } from "vitest";
import {
  canUseCustomSlug,
  getApiEndpointRateLimit,
  getLinkCreationRateLimit,
  getLinkPageQuota,
  getLinkQuota,
  hasReachedLinkPageQuota,
  hasReachedLinkQuota,
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
