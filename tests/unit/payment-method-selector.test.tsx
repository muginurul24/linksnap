import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PaymentMethodSelector,
  filterPaymentChannels,
} from "../../src/components/payments/payment-method-selector";
import {
  ALL_PAYMENT_CHANNELS,
  BANK_CHANNELS,
} from "../../src/lib/payments/payment-channels";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("payment method selector", () => {
  it("should render all payment channel groups with search and continue controls", () => {
    const markup = renderToStaticMarkup(<PaymentMethodSelector />);

    for (const label of [
      "Payment method",
      "Search payment methods",
      "Bank Transfer",
      "E-Wallet",
      "QRIS",
      "Convenience Store",
      "Continue",
    ]) {
      expect(markup).toContain(label);
    }

    for (const channel of ["BCA", "GoPay", "QRIS", "Indomaret"]) {
      expect(markup).toContain(channel);
    }
  });

  it("should preselect BCA by default", () => {
    const markup = renderToStaticMarkup(<PaymentMethodSelector />);

    expect(markup).toContain('aria-label="Select BCA Virtual Account"');
    expect(markup).toContain('aria-pressed="true"');
  });

  it("should support controlled selection", () => {
    const markup = renderToStaticMarkup(
      <PaymentMethodSelector selectedChannelId="gopay" />,
    );

    expect(markup).toContain('aria-label="Select GoPay"');
    expect(markup).toContain('aria-pressed="true"');
  });

  it("should disable continue when no channel is selected", () => {
    const markup = renderToStaticMarkup(
      <PaymentMethodSelector defaultChannelId={null} />,
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain(">Continue</button>");
  });

  it("should filter channels by id, name, and category", () => {
    expect(filterPaymentChannels(ALL_PAYMENT_CHANNELS, "bca").map((c) => c.id)).toEqual([
      "bca",
    ]);
    expect(filterPaymentChannels(ALL_PAYMENT_CHANNELS, "E-Wallet").map((c) => c.id)).toEqual([
      "gopay",
      "ovo",
      "dana",
      "shopeepay",
      "linkaja",
    ]);
    expect(filterPaymentChannels(ALL_PAYMENT_CHANNELS, "cashier").map((c) => c.id)).toEqual([
      "indomaret",
      "alfamart",
    ]);
  });

  it("should render one selectable chip per provided channel", () => {
    const markup = renderToStaticMarkup(
      <PaymentMethodSelector channels={BANK_CHANNELS.slice(0, 2)} />,
    );

    expect(markup).toContain("Select BCA Virtual Account");
    expect(markup).toContain("Select BNI Virtual Account");
    expect(markup).not.toContain("Select GoPay");
  });

  it("should keep selection logic wired to component state", () => {
    const source = readSource(
      "src/components/payments/payment-method-selector.tsx",
    );

    expect(source).toContain("setInternalSelectedId(channel.id)");
    expect(source).toContain("onSelectedChannelChange?.(channel)");
    expect(source).toContain("onContinue?.(selectedChannel)");
  });
});
