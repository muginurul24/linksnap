import { describe, expect, it } from "vitest";
import { LANDING_HERO_STATS } from "../../src/components/landing/landing-page";

describe("landing hero stats", () => {
  it("should use realistic feature-backed stats", () => {
    expect(LANDING_HERO_STATS).toEqual([
      ["4", "Smart rule types"],
      ["120/min", "Business API limit"],
      ["365d", "Analytics retention"],
      ["500", "Business QR codes"],
    ]);
  });

  it("should avoid pre-launch inflated or ambiguous redirect-count stats", () => {
    const values = LANDING_HERO_STATS.flat();

    expect(values).not.toContain("308");
    expect(values).not.toContain("1M+");
  });
});
