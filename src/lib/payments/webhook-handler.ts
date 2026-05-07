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
  mapMidtransStatus,
  parseMidtransGrossAmount,
  parseMidtransTimestamp,
} from "@/lib/payments/webhook";
import type { MidtransWebhookNotification } from "@/lib/validations/payment";

const TERMINAL_PAYMENT_STATUSES = new Set<PaymentStatus>([
  "CANCEL",
  "DENY",
  "EXPIRE",
  "SETTLEMENT",
]);

export type MidtransWebhookResult = {
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
    super(`Payment order ${orderId} amount does not match Midtrans notification.`);
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

function assertNotificationAmountMatches(
  notification: MidtransWebhookNotification,
  transaction: PaymentTransactionForWebhook,
): void {
  const notifiedAmount = parseMidtransGrossAmount(notification.gross_amount);

  if (notifiedAmount !== transaction.grossAmountIdr) {
    throw new PaymentAmountMismatchError(transaction.orderId);
  }
}

export async function handleMidtransPaymentWebhook(
  notification: MidtransWebhookNotification,
): Promise<MidtransWebhookResult> {
  const statusAction = mapMidtransStatus(notification);

  if (!statusAction) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: notification.order_id,
      status: null,
    };
  }

  const transaction = await findPaymentTransactionByOrderId(notification.order_id);
  if (!transaction) throw new UnknownPaymentOrderError(notification.order_id);

  assertNotificationAmountMatches(notification, transaction);

  if (shouldIgnoreStatusTransition(transaction.status, statusAction.status)) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: notification.order_id,
      status: transaction.status,
    };
  }

  const paidAt = statusAction.activateSubscription
    ? parseMidtransTimestamp(
        notification.settlement_time ?? notification.transaction_time,
      ) ?? new Date()
    : undefined;
  const updatedTransaction = await updatePaymentTransactionStatus({
    expectedStatus: transaction.status,
    orderId: notification.order_id,
    paidAt,
    paymentMethod: notification.payment_type ?? null,
    status: statusAction.status,
  });

  if (!updatedTransaction) {
    return {
      activatedSubscription: false,
      ignored: true,
      orderId: notification.order_id,
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
    orderId: notification.order_id,
    status: statusAction.status,
  };
}
