import { createHash, timingSafeEqual } from "node:crypto";
import type { PaymentStatus } from "@/lib/db/queries/payments";
import { getMidtransServerKey } from "@/lib/payments/midtrans";
import type { MidtransWebhookNotification } from "@/lib/validations/payment";

const SUCCESSFUL_STATUSES = new Set(["settlement", "capture"]);
const FAILED_STATUSES = new Set(["cancel", "deny", "expire"]);

export type MidtransStatusAction = {
  activateSubscription: boolean;
  status: PaymentStatus;
};

export function calculateMidtransSignature({
  grossAmount,
  orderId,
  serverKey,
  statusCode,
}: {
  grossAmount: string;
  orderId: string;
  serverKey: string;
  statusCode: string;
}): string {
  return createHash("sha512")
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest("hex");
}

export function verifyMidtransSignature(
  notification: MidtransWebhookNotification,
  serverKey = getMidtransServerKey(),
): boolean {
  const expected = calculateMidtransSignature({
    grossAmount: notification.gross_amount,
    orderId: notification.order_id,
    serverKey,
    statusCode: notification.status_code,
  });
  const provided = notification.signature_key.toLowerCase();

  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function isFraudAccepted(fraudStatus: string | undefined): boolean {
  return fraudStatus === undefined || fraudStatus.toLowerCase() === "accept";
}

export function mapMidtransStatus(
  notification: MidtransWebhookNotification,
): MidtransStatusAction | null {
  const transactionStatus = notification.transaction_status.toLowerCase();

  if (
    SUCCESSFUL_STATUSES.has(transactionStatus) &&
    notification.status_code === "200" &&
    isFraudAccepted(notification.fraud_status)
  ) {
    return {
      activateSubscription: true,
      status: "SETTLEMENT",
    };
  }

  if (transactionStatus === "pending") {
    return {
      activateSubscription: false,
      status: "PENDING",
    };
  }

  if (FAILED_STATUSES.has(transactionStatus)) {
    return {
      activateSubscription: false,
      status: transactionStatus.toUpperCase() as PaymentStatus,
    };
  }

  if (notification.fraud_status?.toLowerCase() === "deny") {
    return {
      activateSubscription: false,
      status: "DENY",
    };
  }

  return null;
}

export function parseMidtransTimestamp(value: string | undefined): Date | null {
  if (!value) return null;

  const parsed = new Date(`${value.replace(" ", "T")}+07:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseMidtransGrossAmount(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  return Math.round(amount);
}
