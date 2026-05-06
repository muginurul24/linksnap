import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatClickCount,
  getReadableTextColor,
  getSafeHexColor,
  LinkPageRenderer,
  type LinkPageRendererConfig,
} from "../../src/components/link-page/link-page-renderer";

const basePage: LinkPageRendererConfig = {
  brandLogo: null,
  brandName: "Acme Studio",
  countdownTarget: null,
  ctaColor: "#111827",
  ctaText: "Shop now",
  description: "Limited launch promo for early customers.",
  ogImage: null,
  showCountdown: false,
  showQrCode: false,
  showSocialProof: true,
  theme: "light",
  title: "Launch Promo",
};

describe("LinkPageRenderer", () => {
  it("should render the public Link Page content", async () => {
    const markup = renderToStaticMarkup(
      await LinkPageRenderer({
        clickCount: 1234,
        destinationUrl: "https://example.com/promo",
        page: basePage,
        shortUrl: "https://linksnap.test/promo",
      }),
    );

    expect(markup).toContain("Acme Studio");
    expect(markup).toContain("Launch Promo");
    expect(markup).toContain("Limited launch promo");
    expect(markup).toContain("Shop now");
    expect(markup).toContain("1,234 people clicked this link");
    expect(markup).toContain("Powered by LinkSnap");
    expect(markup).toContain('href="https://example.com/promo"');
  });

  it("should render a QR code when enabled", async () => {
    const markup = renderToStaticMarkup(
      await LinkPageRenderer({
        clickCount: 0,
        destinationUrl: "https://example.com/promo",
        page: { ...basePage, showQrCode: true },
        shortUrl: "https://linksnap.test/promo",
      }),
    );

    expect(markup).toContain("data:image/png;base64");
    expect(markup).toContain("QR code for https://linksnap.test/promo");
  });
});

describe("Link Page renderer helpers", () => {
  it("should fall back to the default CTA color for invalid colors", () => {
    expect(getSafeHexColor("blue")).toBe("#6366f1");
  });

  it("should choose readable CTA text colors", () => {
    expect(getReadableTextColor("#ffffff")).toBe("#111827");
    expect(getReadableTextColor("#111827")).toBe("#ffffff");
  });

  it("should format social proof counts", () => {
    expect(formatClickCount(1)).toBe("1 person clicked this link");
    expect(formatClickCount(2500)).toBe("2,500 people clicked this link");
  });
});
