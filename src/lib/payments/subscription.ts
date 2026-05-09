import type {
  PaymentTransactionForWebhook,
  SubscriptionRecord,
} from "@/lib/db/queries/payments";
import {
  expireSubscriptionForUser,
  expireSubscriptionsByIds,
  findSubscriptionByUserId,
  listExpiredActiveSubscriptions,
  updateUserPlanForPayment,
  updateUserPlanForSubscription,
  updateUserPlansToFree,
  upsertActiveSubscriptionForUser,
} from "@/lib/db/queries/payments";
import { sendPaymentInvoiceEmail } from "@/lib/email/payment-emails";
import type { UserPlan } from "@/lib/links/limits";
import { logger } from "@/lib/observability/logger";
import {
  paidPlanSchema,
  paymentDurationSchema,
  type PaidPlan,
  type PaymentDuration,
} from "@/lib/validations/payment";

const DEFAULT_EXPIRY_BATCH_LIMIT = 100;

export type SubscriptionSnapshot = {
  expired: boolean;
  plan: UserPlan;
  subscription: SubscriptionRecord | null;
};

export type ExpireDueSubscriptionsResult = {
  expiredSubscriptions: number;
  downgradedUsers: number;
  userIds: string[];
};

export class InvalidSubscriptionPaymentError extends Error {
  constructor(orderId: string) {
    super(`Payment order ${orderId} has invalid subscription data.`);
  }
}

function parsePaidPlan(plan: string, orderId: string): PaidPlan {
  const parsed = paidPlanSchema.safeParse(plan);
  if (!parsed.success) throw new InvalidSubscriptionPaymentError(orderId);

  return parsed.data;
}

function parsePaymentDuration(duration: string, orderId: string): PaymentDuration {
  const parsed = paymentDurationSchema.safeParse(duration);
  if (!parsed.success) throw new InvalidSubscriptionPaymentError(orderId);

  return parsed.data;
}

export function calculateSubscriptionPeriodEnd(
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

export async function createOrRenewSubscriptionForPayment(
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
    logger.error("payment_invoice_email_failed", {
      error,
      orderId: transaction.orderId,
    });
  }
}

export async function syncSubscriptionStatusForUser(
  userId: string,
  now = new Date(),
): Promise<SubscriptionSnapshot> {
  const subscription = await findSubscriptionByUserId(userId);

  if (!subscription) {
    return {
      expired: false,
      plan: "FREE",
      subscription: null,
    };
  }

  if (subscription.status === "ACTIVE" && subscription.currentPeriodEnd <= now) {
    await expireSubscriptionForUser({ expiredAt: now, userId });
    await updateUserPlanForSubscription({ plan: "FREE", userId });

    return {
      expired: true,
      plan: "FREE",
      subscription: {
        ...subscription,
        canceledAt: now,
        status: "EXPIRED",
        updatedAt: now,
      },
    };
  }

  return {
    expired: false,
    plan: subscription.status === "ACTIVE" ? subscription.plan : "FREE",
    subscription,
  };
}

export async function expireDueSubscriptions({
  limit = DEFAULT_EXPIRY_BATCH_LIMIT,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}): Promise<ExpireDueSubscriptionsResult> {
  const expiredSubscriptions = await listExpiredActiveSubscriptions({ limit, now });
  if (expiredSubscriptions.length === 0) {
    return {
      downgradedUsers: 0,
      expiredSubscriptions: 0,
      userIds: [],
    };
  }

  const expiredCount = await expireSubscriptionsByIds({
    expiredAt: now,
    ids: expiredSubscriptions.map((subscription) => subscription.id),
  });
  const downgradedUsers = await updateUserPlansToFree(
    expiredSubscriptions.map((subscription) => subscription.userId),
  );

  return {
    downgradedUsers,
    expiredSubscriptions: expiredCount,
    userIds: expiredSubscriptions.map((subscription) => subscription.userId),
  };
}
