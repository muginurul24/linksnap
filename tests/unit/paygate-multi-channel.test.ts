import { describe, expect, it } from "vitest";
import {
  buildPayGateChargePayload,
  PAYGATE_BANK_CODES,
  PAYGATE_CSTORE_CODES,
  PAYGATE_EWALLET_CODES,
  PayGateUnsupportedChannelError,
  resolvePayGatePaymentChannel,
  type PayGateChargeInput,
} from "../../src/lib/payments/paygate";

function createChargeInput(
  overrides: Partial<PayGateChargeInput> = {},
): PayGateChargeInput {
  return {
    callbackUrl: "https://linksnap.test/api/v1/payments/webhook",
    customer: {
      email: "buyer@example.com",
      name: "Rafi Link",
    },
    duration: "MONTHLY",
    grossAmountIdr: 128000,
    orderId: "LS-123",
    plan: "PRO",
    ...overrides,
  };
}

describe("PayGate multi-channel client", () => {
  it("should construct bank transfer payloads for every supported bank", () => {
    for (const bank of PAYGATE_BANK_CODES) {
      expect(
        buildPayGateChargePayload(createChargeInput({ paymentMethod: bank })),
      ).toMatchObject({
        bank,
        metadata: {
          paymentMethod: bank,
          paymentType: "bank_transfer",
        },
        payment_type: "bank_transfer",
      });
    }
  });

  it("should use QRIS GoPay as the default production channel", () => {
    expect(buildPayGateChargePayload(createChargeInput())).toMatchObject({
      acquirer: "gopay",
      metadata: {
        paymentMethod: "qris_gopay",
        paymentType: "qris",
      },
      payment_type: "qris",
    });
  });

  it("should resolve explicit legacy channel fields", () => {
    expect(buildPayGateChargePayload(createChargeInput({ bank: "bni" }))).toMatchObject({
      bank: "bni",
      payment_type: "bank_transfer",
    });
    expect(
      buildPayGateChargePayload(createChargeInput({ ewallet: "gopay" })),
    ).toMatchObject({
      ewallet: "gopay",
      payment_type: "ewallet",
    });
  });

  it("should construct e-wallet payloads for every supported wallet", () => {
    for (const ewallet of PAYGATE_EWALLET_CODES) {
      expect(
        buildPayGateChargePayload(createChargeInput({ paymentMethod: ewallet })),
      ).toMatchObject({
        ewallet,
        metadata: {
          paymentMethod: ewallet,
          paymentType: "ewallet",
        },
        payment_type: "ewallet",
      });
    }
  });

  it("should construct QRIS dynamic GoPay payloads with the GoPay acquirer", () => {
    const payload = buildPayGateChargePayload(
      createChargeInput({ paymentMethod: "qris_gopay" }),
    );

    expect(payload).toMatchObject({
      acquirer: "gopay",
      metadata: {
        paymentMethod: "qris_gopay",
        paymentType: "qris",
      },
      payment_type: "qris",
    });
    expect("bank" in payload).toBe(false);
    expect("ewallet" in payload).toBe(false);
    expect("store" in payload).toBe(false);
  });

  it("should construct convenience-store payloads for every supported store", () => {
    for (const store of PAYGATE_CSTORE_CODES) {
      expect(
        buildPayGateChargePayload(createChargeInput({ paymentMethod: store })),
      ).toMatchObject({
        metadata: {
          paymentMethod: store,
          paymentType: "cstore",
        },
        payment_type: "cstore",
        store,
      });
    }
  });

  it("should reject unsupported payment channels before sending to PayGate", () => {
    expect(() =>
      resolvePayGatePaymentChannel({
        paymentMethod: "paypal" as never,
      }),
    ).toThrow(PayGateUnsupportedChannelError);
  });

  it("should resolve rich channel descriptors for API mapping", () => {
    expect(resolvePayGatePaymentChannel({ paymentMethod: "bri" })).toEqual({
      bank: "bri",
      paymentMethod: "bri",
      paymentType: "bank_transfer",
    });
    expect(resolvePayGatePaymentChannel({ paymentMethod: "gopay" })).toEqual({
      ewallet: "gopay",
      paymentMethod: "gopay",
      paymentType: "ewallet",
    });
    expect(resolvePayGatePaymentChannel({ paymentMethod: "qris_gopay" })).toEqual({
      acquirer: "gopay",
      paymentMethod: "qris_gopay",
      paymentType: "qris",
    });
  });
});
