import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@/lib/db/queries/payments";
import { PayGateConfigurationError } from "@/lib/payments/paygate";

const PAYGATE_SIGNATURE_PREFIX = "sha256=";

export type PayGateWebhookStatus =
  | "paid"
  | "pending"
  | "failed"
  | "expired"
  | "cancelled"
  | "challenge"
  | "refunded"
  | "partial_refunded";

export type PayGateWebhookStatusAction = {
  activateSubscription: boolean;
  status: PaymentStatus;
};

function getWebhookSecret(secret?: string): string {
  const configuredSecret = secret ?? process.env.PAYGATE_WEBHOOK_SECRET;
  const trimmed = configuredSecret?.trim();

  if (!trimmed) {
    throw new PayGateConfigurationError("PAYGATE_WEBHOOK_SECRET is not configured.");
  }

  return trimmed;
}

function normalizeSignature(signature: string): string | null {
  const trimmed = signature.trim();
  const value = trimmed.startsWith(PAYGATE_SIGNATURE_PREFIX)
    ? trimmed.slice(PAYGATE_SIGNATURE_PREFIX.length)
    : trimmed;

  return /^[a-f0-9]+$/i.test(value) ? value.toLowerCase() : null;
}

export function verifyPayGateWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret?: string,
): boolean {
  const normalizedSignature = normalizeSignature(signature);
  if (!normalizedSignature) return false;

  const expected = createHmac("sha256", getWebhookSecret(secret))
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  if (normalizedSignature.length !== expected.length) return false;

  return timingSafeEqual(
    Buffer.from(normalizedSignature, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export function mapPayGateStatus(
  status: PayGateWebhookStatus,
): PayGateWebhookStatusAction | null {
  switch (status) {
    case "paid":
      return {
        activateSubscription: true,
        status: "SETTLEMENT",
      };
    case "pending":
    case "challenge":
      return {
        activateSubscription: false,
        status: "PENDING",
      };
    case "failed":
      return {
        activateSubscription: false,
        status: "DENY",
      };
    case "expired":
      return {
        activateSubscription: false,
        status: "EXPIRE",
      };
    case "cancelled":
      return {
        activateSubscription: false,
        status: "CANCEL",
      };
    case "refunded":
    case "partial_refunded":
      return null;
  }
}

export function parsePayGateTimestamp(value: string | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
