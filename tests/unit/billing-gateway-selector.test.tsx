import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  UpgradeButton,
  getPaymentCreateEndpoint,
  getPaymentRedirectUrl,
} from "../../src/app/(dashboard)/settings/billing/upgrade-button";

describe("billing gateway selector", () => {
  it("should render Midtrans as the only payment option", () => {
    const markup = renderToStaticMarkup(
      <UpgradeButton
        availableGateways={["midtrans"]}
        current={false}
        gateway="midtrans"
        plan="PRO"
      />,
    );

    expect(markup).toContain("Midtrans");
    expect(markup).toContain("Bank Lokal");
    expect(markup).toContain('type="radio"');
  });

  it("should disable the single payment option", () => {
    const markup = renderToStaticMarkup(
      <UpgradeButton
        availableGateways={["midtrans"]}
        current={false}
        gateway="midtrans"
        plan="BUSINESS"
      />,
    );

    expect(markup).toContain("Midtrans");
    expect(markup).toContain("disabled");
  });

  it("should choose the Midtrans create endpoint and redirect URL", () => {
    expect(getPaymentCreateEndpoint("midtrans")).toBe("/api/v1/payments/create");
    expect(
      getPaymentRedirectUrl("midtrans", {
        orderId: "LS-123",
        redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
        snapToken: "token-1",
      }),
    ).toBe("https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1");
  });
});
