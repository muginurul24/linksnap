import { describe, expect, it } from "vitest";
import { isValidUrl, passwordScore, slugSchema } from "@/lib/utils/validation";

describe("mobile validation", () => {
  it("should accept HTTPS URLs when creating short links", () => {
    expect(isValidUrl("https://linksnap.id/pricing")).toBe(true);
  });

  it("should reject unsupported URL protocols when creating short links", () => {
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("should score strong passwords when all requirements pass", () => {
    expect(passwordScore("LinkSnap2026!")).toBe(3);
  });

  it("should reject invalid slugs when special characters are used", () => {
    expect(slugSchema.safeParse("bad/slug").success).toBe(false);
  });
});
