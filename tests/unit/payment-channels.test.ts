import { describe, expect, it } from "vitest";
import {
  ALL_PAYMENT_CHANNELS,
  BANK_CHANNELS,
  CHANNELS_BY_CATEGORY,
  CSTORE_CHANNELS,
  EWALLET_CHANNELS,
  PAYMENT_CHANNEL_CATEGORY_COLORS,
  QRIS_CHANNEL,
  getChannelById,
  getChannelCategoryColors,
  getChannelIcon,
  getPaymentInstructions,
  isPaymentChannelId,
} from "../../src/lib/payments/payment-channels";
import {
  PAYGATE_BANK_CODES,
  PAYGATE_CSTORE_CODES,
  PAYGATE_EWALLET_CODES,
  PAYGATE_QRIS_CODES,
} from "../../src/lib/payments/paygate";

describe("payment channel registry", () => {
  it("should expose all PayGate-backed channels in deterministic priority order", () => {
    expect(ALL_PAYMENT_CHANNELS.map((channel) => channel.id)).toEqual([
      ...PAYGATE_BANK_CODES,
      ...PAYGATE_EWALLET_CODES,
      ...PAYGATE_QRIS_CODES,
      ...PAYGATE_CSTORE_CODES,
    ]);
    expect(ALL_PAYMENT_CHANNELS.map((channel) => channel.priority)).toEqual(
      [...ALL_PAYMENT_CHANNELS]
        .map((channel) => channel.priority)
        .sort((a, b) => a - b),
    );
  });

  it("should group channels by category", () => {
    expect(BANK_CHANNELS.map((channel) => channel.id)).toEqual(PAYGATE_BANK_CODES);
    expect(EWALLET_CHANNELS.map((channel) => channel.id)).toEqual(
      PAYGATE_EWALLET_CODES,
    );
    expect(QRIS_CHANNEL.id).toBe("qris_gopay");
    expect(CSTORE_CHANNELS.map((channel) => channel.id)).toEqual(
      PAYGATE_CSTORE_CODES,
    );

    expect(CHANNELS_BY_CATEGORY.bank_transfer).toBe(BANK_CHANNELS);
    expect(CHANNELS_BY_CATEGORY.ewallet).toBe(EWALLET_CHANNELS);
    expect(CHANNELS_BY_CATEGORY.qris).toEqual([QRIS_CHANNEL]);
    expect(CHANNELS_BY_CATEGORY.convenience_store).toBe(CSTORE_CHANNELS);
  });

  it("should keep channel IDs unique", () => {
    const ids = ALL_PAYMENT_CHANNELS.map((channel) => channel.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should return channel metadata by ID", () => {
    expect(getChannelById("bsi")).toMatchObject({
      category: "bank_transfer",
      icon: "building-2",
      name: "BSI Virtual Account",
      paymentType: "bank_transfer",
      shortName: "BSI",
    });
    expect(getChannelById("gopay")).toMatchObject({
      category: "ewallet",
      icon: "smartphone",
      paymentType: "ewallet",
      shortName: "GoPay",
    });
    expect(getChannelById("qris_gopay")).toMatchObject({
      category: "qris",
      icon: "qr-code",
      name: "QRIS Dinamis GoPay",
      paymentType: "qris",
    });
    expect(getChannelById("paypal")).toBeUndefined();
  });

  it("should expose helper functions for UI components", () => {
    expect(isPaymentChannelId("gopay")).toBe(true);
    expect(isPaymentChannelId("paypal")).toBe(false);
    expect(getChannelIcon("qris_gopay")).toBe("qr-code");
    expect(getChannelIcon("paypal")).toBeUndefined();
    expect(getPaymentInstructions("qris_gopay")).toContain("dynamic QRIS code");
    expect(getPaymentInstructions("paypal")).toBeUndefined();
  });

  it("should expose badge color mapping per category", () => {
    for (const category of [
      "bank_transfer",
      "convenience_store",
      "ewallet",
      "qris",
    ] as const) {
      expect(getChannelCategoryColors(category)).toBe(
        PAYMENT_CHANNEL_CATEGORY_COLORS[category],
      );
      expect(getChannelCategoryColors(category).badgeClassName).toContain("bg-");
      expect(getChannelCategoryColors(category).selectedClassName).toContain(
        "border-",
      );
    }
  });
});
