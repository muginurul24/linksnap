import type {
  PaymentStatus,
  PaymentTransactionForWebhook,
} from "@/lib/db/queries/payments";
import {
  findPaymentTransactionByOrderId,
  updatePaymentTransactionStatus,
} from "@/lib/db/queries/payments";
import {
  InvalidSubscriptionPaymentError,
  createOrRenewSubscriptionForPayment,
} from "@/lib/payments/subscription";
import { invalidateSubscriptionCaches } from "@/lib/cache/invalidation";
import {
  mapPayGateStatus,
  parsePayGateTimestamp,
  type PayGateWebhookStatus,
} from "@/lib/payments/paygate-webhook";

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "CANCEL",
  "DENY",
  "EXPIRE",
  "SETTLEMENT",
]);

type PayGateWebhookPayload = {
  amount: number;
  metadata?: Record<string, unknown>;
  midtrans?: {
    transaction_id?: string;
  };
  order_id: string;
  paid_at?: string;
  payment_type?: string;
  status: PayGateWebhookStatus;
  transaction_id: string;
};

export type PayGateWebhookResult = {
  activatedSubscription: boolean;
  ignored: boolean;
  orderId: string;
  status: PaymentStatus | null;
};

export class UnknownPaymentOrderError extends Error {
  constructor(orderId: string) {
    super(`Payment order ${orderId} was not found.`);
  }
}

export class PaymentAmountMismatchError extends Error {
  constructor(orderId: string) {
    super(`Payment order ${orderId} amount does not match PayGate webhook.`);
  }
}

export class InvalidPaymentPlanError extends Error {
  constructor(orderId: string) {
    super(`Payment order ${orderId} has invalid plan data.`);
  }
}

function shouldIgnoreStatusTransition(
  currentStatus: PaymentStatus,
  nextStatus: PaymentStatus,
): boolean {
  if (currentStatus === nextStatus) return true;
  if (currentStatus === "SETTLEMENT") return true;

  return TERMINAL_PAYMENT_STATUSES.has(currentStatus);
}

function assertWebhookAmountMatches(
  payload: PayGateWebhookPayload,
  transaction: PaymentTransactionForWebhook,
): void {
  if (payload.amount !== transaction.grossAmountIdr) {
    throw new PaymentAmountMismatchError(transaction.orderId);
  }
}

function getWebhookMetadataString(
  payload: PayGateWebhookPayload,
  key: string,
): string | null {
  const value = payload.metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getWebhookPaymentMethod(payload: PayGateWebhookPayload): string | null {
  return getWebhookMetadataString(payload, "paymentMethod") ?? payload.payment_type ?? null;
}

function getWebhookProviderTransactionId(
  payload: PayGateWebhookPayload,
): string | null {
  return payload.transaction_id || payload.midtrans?.transaction_id || null;
}

export async function handlePayGatePaymentWebhook(
  payload: PayGateWebhookPayload,
): Promise<PayGateWebhookResult> {
  const statusAction = mapPayGateStatus(payload.status);

  if (!statusAction) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: payload.order_id,
      status: null,
    };
  }

  const transaction = await findPaymentTransactionByOrderId(payload.order_id);
  if (!transaction) throw new UnknownPaymentOrderError(payload.order_id);

  assertWebhookAmountMatches(payload, transaction);

  if (shouldIgnoreStatusTransition(transaction.status, statusAction.status)) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: payload.order_id,
      status: transaction.status,
    };
  }

  const paidAt = statusAction.activateSubscription
    ? parsePayGateTimestamp(payload.paid_at) ?? new Date()
    : undefined;
  const updatedTransaction = await updatePaymentTransactionStatus({
    expectedStatus: transaction.status,
    orderId: payload.order_id,
    paidAt,
    paymentMethod: getWebhookPaymentMethod(payload),
    status: statusAction.status,
  });

  if (!updatedTransaction) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: payload.order_id,
      status: statusAction.status,
    };
  }

  if (statusAction.activateSubscription) {
    try {
      await createOrRenewSubscriptionForPayment(updatedTransaction, {
        paymentMethod: getWebhookPaymentMethod(payload),
        providerTransactionId: getWebhookProviderTransactionId(payload),
      });
      await invalidateSubscriptionCaches({
        reason: "payment_subscription_activation",
        userId: updatedTransaction.userId,
      });
    } catch (error) {
      if (error instanceof InvalidSubscriptionPaymentError) {
        throw new InvalidPaymentPlanError(updatedTransaction.orderId);
      }

      throw error;
    }
  }

  return {
    activatedSubscription: statusAction.activateSubscription,
    ignored: false,
    orderId: payload.order_id,
    status: statusAction.status,
  };
}
