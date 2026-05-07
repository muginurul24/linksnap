import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  UpgradeButton,
  getPaymentCreateEndpoint,
  getPaymentRedirectUrl,
} from "../../src/app/(dashboard)/settings/billing/upgrade-button";

describe("billing gateway selector", () => {
  it("should render Stripe and Midtrans options for Indonesia clients", () => {
    const markup = renderToStaticMarkup(
      <UpgradeButton
        availableGateways={["midtrans", "stripe"]}
        current={false}
        gateway="midtrans"
        plan="PRO"
      />,
    );

    expect(markup).toContain("Midtrans");
    expect(markup).toContain("Bank Lokal");
    expect(markup).toContain("Stripe");
    expect(markup).toContain("Credit Card");
    expect(markup).toContain('type="radio"');
  });

  it("should render Stripe as the only selected option for non-Indonesia clients", () => {
    const markup = renderToStaticMarkup(
      <UpgradeButton
        availableGateways={["stripe"]}
        current={false}
        gateway="stripe"
        plan="BUSINESS"
      />,
    );

    expect(markup).toContain("Stripe");
    expect(markup).toContain("Credit Card");
    expect(markup).not.toContain("Midtrans");
    expect(markup).toContain("disabled");
  });

  it("should choose the correct create endpoint and redirect URL per gateway", () => {
    expect(getPaymentCreateEndpoint("stripe")).toBe(
      "/api/v1/payments/stripe/create",
    );
    expect(getPaymentCreateEndpoint("midtrans")).toBe("/api/v1/payments/create");
    expect(
      getPaymentRedirectUrl("stripe", {
        orderId: "LS-ST-123",
        sessionId: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      }),
    ).toBe("https://checkout.stripe.com/c/pay/cs_test_123");
    expect(
      getPaymentRedirectUrl("midtrans", {
        orderId: "LS-123",
        redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
        snapToken: "token-1",
      }),
    ).toBe("https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1");
  });
});
