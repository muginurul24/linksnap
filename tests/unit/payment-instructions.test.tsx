import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CheckoutStatusClient,
  getExpirationCountdown,
} from "../../src/app/(marketing)/checkout/success/checkout-status-client";
import { PaymentInstructionsBank } from "../../src/components/payments/payment-instructions-bank";
import { PaymentInstructionsCstore } from "../../src/components/payments/payment-instructions-cstore";
import { PaymentInstructionsEwallet } from "../../src/components/payments/payment-instructions-ewallet";
import { PaymentInstructionsQris } from "../../src/components/payments/payment-instructions-qris";
import { getChannelById } from "../../src/lib/payments/payment-channels";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

function getRequiredChannel(id: string) {
  const channel = getChannelById(id);
  if (!channel) throw new Error(`Missing channel ${id}`);
  return channel;
}

describe("payment instructions", () => {
  it("should render bank transfer instructions with copyable VA number", () => {
    const markup = renderToStaticMarkup(
      <PaymentInstructionsBank
        channel={getRequiredChannel("bca")}
        vaNumber={{ bank: "bca", va_number: "88001234567890" }}
      />,
    );

    expect(markup).toContain("BCA virtual account");
    expect(markup).toContain("88001234567890");
    expect(markup).toContain("Copy");
  });

  it("should render e-wallet, QRIS, and convenience-store instructions", () => {
    expect(
      renderToStaticMarkup(
        <PaymentInstructionsEwallet
          actions={[{ type: "deeplink", url: "https://wallet.example/gopay" }]}
          channel={getRequiredChannel("gopay")}
        />,
      ),
    ).toContain("Complete in your GoPay app");

    expect(
      renderToStaticMarkup(
        <PaymentInstructionsQris
          channel={getRequiredChannel("qris")}
          qrString="000201010212"
          qrUrl="https://pay.example/qris.png"
        />,
      ),
    ).toContain("Scan with any QRIS app");

    expect(
      renderToStaticMarkup(
        <PaymentInstructionsCstore
          channel={getRequiredChannel("indomaret")}
          paymentCode="1234567890"
        />,
      ),
    ).toContain("Show at Indomaret cashier");
  });

  it("should format expiration countdowns", () => {
    const now = new Date("2026-05-09T02:00:00Z").getTime();

    expect(getExpirationCountdown("2026-05-09T03:02:03Z", now)).toBe(
      "1h 2m 3s",
    );
    expect(getExpirationCountdown("2026-05-09T02:00:05Z", now)).toBe("5s");
    expect(getExpirationCountdown("2026-05-09T01:59:00Z", now)).toBe("Expired");
  });

  it("should keep checkout status polling and settlement redirect wired", () => {
    const source = readSource(
      "src/app/(marketing)/checkout/success/checkout-status-client.tsx",
    );
    const markup = renderToStaticMarkup(
      <CheckoutStatusClient orderId="LS-1777777777777-abcdef123456" />,
    );

    expect(source).toContain("10_000");
    expect(source).toContain("window.location.assign(\"/settings/billing?refresh=plan\")");
    expect(markup).toContain("Checkout complete");
  });
});
