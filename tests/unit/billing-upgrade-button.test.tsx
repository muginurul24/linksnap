import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  UpgradeButton,
  getPaymentCreateEndpoint,
  getPaymentRedirectUrl,
} from "../../src/app/(dashboard)/settings/billing/upgrade-button";

describe("billing upgrade button", () => {
  it("should render a single upgrade button without radio controls", () => {
    const markup = renderToStaticMarkup(
      <UpgradeButton current={false} plan="PRO" />,
    );

    expect(markup).toContain("Upgrade to Pro");
    expect(markup).not.toContain('type="radio"');
  });

  it("should render current plan state", () => {
    const markup = renderToStaticMarkup(<UpgradeButton current plan="BUSINESS" />);

    expect(markup).toContain("Current Plan");
    expect(markup).toContain("disabled");
  });

  it("should choose the Midtrans create endpoint and redirect URL", () => {
    expect(getPaymentCreateEndpoint()).toBe("/api/v1/payments/create");
    expect(
      getPaymentRedirectUrl({
        orderId: "LS-123",
        redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
        snapToken: "token-1",
      }),
    ).toBe("https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1");
  });
});
