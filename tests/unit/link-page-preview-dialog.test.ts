import { describe, expect, it } from "vitest";
import { toLinkPagePreviewConfig } from "../../src/app/(dashboard)/links/link-page-preview-dialog";

describe("link page preview dialog helpers", () => {
  it("should parse API Link Page config for preview rendering", () => {
    const config = toLinkPagePreviewConfig({
      brandName: "Acme",
      countdownTarget: "2026-05-08T12:03:04.000Z",
      ctaColor: "#111827",
      ctaText: "Shop now",
      description: "Promo",
      ogImage: "https://example.com/og.png",
      showCountdown: true,
      showQrCode: true,
      showSocialProof: true,
      theme: "dark",
      title: "Launch",
    });

    expect(config.brandLogo).toBeNull();
    expect(config.countdownTarget).toEqual(new Date("2026-05-08T12:03:04.000Z"));
    expect(config.title).toBe("Launch");
  });

  it("should ignore invalid countdown dates from the API", () => {
    const config = toLinkPagePreviewConfig({
      brandName: "Acme",
      countdownTarget: "not-a-date",
      ctaColor: "#111827",
      ctaText: "Shop now",
      description: null,
      ogImage: null,
      showCountdown: true,
      showQrCode: true,
      showSocialProof: true,
      theme: "auto",
      title: "Launch",
    });

    expect(config.countdownTarget).toBeNull();
  });
});
