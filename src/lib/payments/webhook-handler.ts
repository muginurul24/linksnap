import type {
  PaymentStatus,
  PaymentTransactionForWebhook,
} from "@/lib/db/queries/payments";
import {
  findPaymentTransactionByOrderId,
  updatePaymentTransactionStatus,
  updateUserPlanForPayment,
  upsertActiveSubscriptionForUser,
} from "@/lib/db/queries/payments";
import { sendPaymentInvoiceEmail } from "@/lib/email/payment-emails";
import {
  mapMidtransStatus,
  parseMidtransGrossAmount,
  parseMidtransTimestamp,
} from "@/lib/payments/webhook";
import {
  paidPlanSchema,
  paymentDurationSchema,
  type MidtransWebhookNotification,
  type PaidPlan,
  type PaymentDuration,
} from "@/lib/validations/payment";

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

function parsePaidPlan(plan: string, orderId: string): PaidPlan {
  const parsed = paidPlanSchema.safeParse(plan);
  if (!parsed.success) throw new InvalidPaymentPlanError(orderId);

  return parsed.data;
}

function parsePaymentDuration(duration: string, orderId: string): PaymentDuration {
  const parsed = paymentDurationSchema.safeParse(duration);
  if (!parsed.success) throw new InvalidPaymentPlanError(orderId);

  return parsed.data;
}

function calculateSubscriptionPeriodEnd(
  start: Date,
  duration: PaymentDuration,
): Date {
  const end = new Date(start);

  if (duration === "YEARLY") {
    end.setFullYear(end.getFullYear() + 1);
    return end;
  }

  end.setMonth(end.getMonth() + 1);
  return end;
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

async function activateSubscriptionFromTransaction(
  transaction: PaymentTransactionForWebhook,
): Promise<void> {
  const plan = parsePaidPlan(transaction.plan, transaction.orderId);
  const duration = parsePaymentDuration(transaction.duration, transaction.orderId);
  const currentPeriodStart = transaction.paidAt ?? new Date();
  const currentPeriodEnd = calculateSubscriptionPeriodEnd(
    currentPeriodStart,
    duration,
  );

  await upsertActiveSubscriptionForUser({
    currentPeriodEnd,
    currentPeriodStart,
    plan,
    userId: transaction.userId,
  });
  await updateUserPlanForPayment({ plan, userId: transaction.userId });

  try {
    await sendPaymentInvoiceEmail({
      duration,
      grossAmountIdr: transaction.grossAmountIdr,
      grossAmountUsd: transaction.grossAmountUsd,
      orderId: transaction.orderId,
      plan,
      to: transaction.userEmail,
    });
  } catch (error) {
    console.error("[payments:webhook] Unable to send invoice email", {
      error,
      orderId: transaction.orderId,
    });
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
    await activateSubscriptionFromTransaction(updatedTransaction);
  }

  return {
    activatedSubscription: statusAction.activateSubscription,
    ignored: false,
    orderId: notification.order_id,
    status: statusAction.status,
  };
}
