import { describe, expect, it } from "vitest";
import {
  calculateMidtransSignature,
  mapMidtransStatus,
  parseMidtransGrossAmount,
  parseMidtransTimestamp,
  verifyMidtransSignature,
} from "../../src/lib/payments/webhook";
import type { MidtransWebhookNotification } from "../../src/lib/validations/payment";

function createNotification(
  overrides: Partial<MidtransWebhookNotification> = {},
): MidtransWebhookNotification {
  const base = {
    gross_amount: "128000.00",
    order_id: "LS-123",
    payment_type: "bank_transfer",
    signature_key: "",
    status_code: "200",
    transaction_status: "settlement",
  } satisfies MidtransWebhookNotification;

  return {
    ...base,
    signature_key: calculateMidtransSignature({
      grossAmount: overrides.gross_amount ?? base.gross_amount,
      orderId: overrides.order_id ?? base.order_id,
      serverKey: "server-key",
      statusCode: overrides.status_code ?? base.status_code,
    }),
    ...overrides,
  };
}

describe("Midtrans webhook helpers", () => {
  it("should calculate and verify Midtrans SHA512 signatures", () => {
    const notification = createNotification();

    expect(
      verifyMidtransSignature(notification, "server-key"),
    ).toBe(true);
    expect(
      verifyMidtransSignature(
        { ...notification, signature_key: "bad-signature" },
        "server-key",
      ),
    ).toBe(false);
  });

  it("should map successful settlement and capture notifications", () => {
    expect(mapMidtransStatus(createNotification())).toEqual({
      activateSubscription: true,
      status: "SETTLEMENT",
    });
    expect(
      mapMidtransStatus(
        createNotification({
          fraud_status: "accept",
          transaction_status: "capture",
        }),
      ),
    ).toEqual({
      activateSubscription: true,
      status: "SETTLEMENT",
    });
  });

  it("should map pending and failed notifications", () => {
    expect(
      mapMidtransStatus(
        createNotification({
          status_code: "201",
          transaction_status: "pending",
        }),
      ),
    ).toEqual({
      activateSubscription: false,
      status: "PENDING",
    });
    expect(
      mapMidtransStatus(
        createNotification({
          transaction_status: "expire",
        }),
      ),
    ).toEqual({
      activateSubscription: false,
      status: "EXPIRE",
    });
  });

  it("should not activate subscription when fraud status is denied", () => {
    expect(
      mapMidtransStatus(
        createNotification({
          fraud_status: "deny",
          transaction_status: "settlement",
        }),
      ),
    ).toEqual({
      activateSubscription: false,
      status: "DENY",
    });
  });

  it("should parse Midtrans timestamps as GMT+7 and normalize gross amount", () => {
    expect(parseMidtransTimestamp("2026-05-07 08:00:00")?.toISOString()).toBe(
      "2026-05-07T01:00:00.000Z",
    );
    expect(parseMidtransGrossAmount("128000.00")).toBe(128000);
    expect(parseMidtransGrossAmount("not-a-number")).toBeNull();
  });
});
