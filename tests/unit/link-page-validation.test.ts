import { describe, expect, it } from "vitest";
import { upsertLinkPageSchema } from "../../src/lib/validations/link-page";

describe("link page validation", () => {
  it("should normalize valid Link Page input with defaults", () => {
    const parsed = upsertLinkPageSchema.safeParse({
      brandName: " Brand ",
      title: " Promo ",
      description: "",
      ogImage: "https://example.com/og.png",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({
      brandName: "Brand",
      ctaColor: "#6366f1",
      ctaText: "Continue",
      description: null,
      ogImage: "https://example.com/og.png",
      showCountdown: false,
      showQrCode: true,
      showSocialProof: true,
      theme: "auto",
      title: "Promo",
    });
  });

  it("should require countdown target when countdown is enabled", () => {
    const parsed = upsertLinkPageSchema.safeParse({
      brandName: "Brand",
      showCountdown: true,
      title: "Promo",
    });

    expect(parsed.success).toBe(false);
  });

  it("should reject invalid colors and image URLs", () => {
    const parsed = upsertLinkPageSchema.safeParse({
      brandName: "Brand",
      ctaColor: "blue",
      ogImage: "javascript:alert(1)",
      title: "Promo",
    });

    expect(parsed.success).toBe(false);
  });

  it("should reject unknown fields", () => {
    const parsed = upsertLinkPageSchema.safeParse({
      brandName: "Brand",
      title: "Promo",
      unexpected: true,
    });

    expect(parsed.success).toBe(false);
  });
});
