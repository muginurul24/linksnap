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
  order_id: string;
  paid_at?: string;
  payment_type?: string;
  status: PayGateWebhookStatus;
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
    paymentMethod: payload.payment_type ?? null,
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
      await createOrRenewSubscriptionForPayment(updatedTransaction);
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
