import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  mapPayGateStatus,
  parsePayGateTimestamp,
  verifyPayGateWebhookSignature,
} from "../../src/lib/payments/paygate-webhook";

function signPayload(rawBody: string, timestamp: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

describe("PayGate webhook helpers", () => {
  it("should verify valid HMAC-SHA256 signatures and reject invalid ones", () => {
    const rawBody = JSON.stringify({ order_id: "LS-123", status: "paid" });
    const timestamp = "2026-05-08T10:00:00+07:00";
    const signature = signPayload(rawBody, timestamp, "webhook-secret");

    expect(
      verifyPayGateWebhookSignature(
        rawBody,
        timestamp,
        signature,
        "webhook-secret",
      ),
    ).toBe(true);
    expect(
      verifyPayGateWebhookSignature(
        rawBody,
        timestamp,
        "sha256=bad-signature",
        "webhook-secret",
      ),
    ).toBe(false);
  });

  it("should map paid, pending, and failed statuses", () => {
    expect(mapPayGateStatus("paid")).toEqual({
      activateSubscription: true,
      status: "SETTLEMENT",
    });
    expect(mapPayGateStatus("pending")).toEqual({
      activateSubscription: false,
      status: "PENDING",
    });
    expect(mapPayGateStatus("failed")).toEqual({
      activateSubscription: false,
      status: "DENY",
    });
    expect(mapPayGateStatus("expired")).toEqual({
      activateSubscription: false,
      status: "EXPIRE",
    });
    expect(mapPayGateStatus("cancelled")).toEqual({
      activateSubscription: false,
      status: "CANCEL",
    });
    expect(mapPayGateStatus("challenge")).toEqual({
      activateSubscription: false,
      status: "PENDING",
    });
  });

  it("should skip refund statuses without activating subscriptions", () => {
    expect(mapPayGateStatus("refunded")).toBeNull();
    expect(mapPayGateStatus("partial_refunded")).toBeNull();
  });

  it("should parse ISO 8601 timestamps", () => {
    expect(parsePayGateTimestamp("2026-05-08T10:00:00+07:00")?.toISOString()).toBe(
      "2026-05-08T03:00:00.000Z",
    );
    expect(parsePayGateTimestamp("not-a-date")).toBeNull();
  });
});
