import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PricingPage from "../../src/components/landing/pricing-page";
import { ALL_PAYMENT_CHANNELS } from "../../src/lib/payments/payment-channels";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("pricing page", () => {
  it("should render plan cards, billing toggle, and current plan state", () => {
    const markup = renderToStaticMarkup(<PricingPage currentPlan="PRO" />);

    expect(markup).toContain("Billing cycle");
    expect(markup).toContain("Free");
    expect(markup).toContain("Pro");
    expect(markup).toContain("Business");
    expect(markup).toContain("Current plan");
    expect(markup).toContain("Recommended");
    expect(markup).toContain("Manage current plan");
  });

  it("should render Midtrans payment trust and all payment methods", () => {
    const markup = renderToStaticMarkup(<PricingPage />);

    expect(markup).toContain("All payments securely processed");
    expect(markup).toContain("Midtrans");
    expect(markup).not.toContain("PayGate");

    for (const channel of ALL_PAYMENT_CHANNELS) {
      expect(markup).toContain(channel.shortName);
    }
  });

  it("should include FAQ and sticky comparison table wiring", () => {
    const markup = renderToStaticMarkup(<PricingPage />);
    const source = readSource("src/components/landing/pricing-page.tsx");

    expect(markup).toContain("What payment methods do you accept?");
    expect(markup).toContain("When does my subscription activate?");
    expect(source).toContain("sticky left-0");
    expect(source).toContain("CHANNELS_BY_CATEGORY");
  });
});
