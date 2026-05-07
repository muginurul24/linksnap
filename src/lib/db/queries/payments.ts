import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, transactions, users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

export type PaymentStatus = typeof transactions.$inferSelect["status"];

export type BillingUser = {
  email: string;
  name: string | null;
  plan: UserPlan;
};

export type PendingTransaction = {
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: UserPlan;
  snapToken: string | null;
};

export type PaymentTransactionForWebhook = {
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: PaymentStatus;
  userEmail: string;
  userId: string;
  userName: string | null;
};

type CreatePendingTransactionInput = {
  duration: PaymentDuration;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: PaidPlan;
  userId: string;
};

type UpdatePaymentTransactionStatusInput = {
  expectedStatus: PaymentStatus;
  orderId: string;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  status: PaymentStatus;
};

export async function findBillingUserById(
  userId: string,
): Promise<BillingUser | null> {
  const user = await db.query.users.findFirst({
    columns: {
      email: true,
      name: true,
      plan: true,
    },
    where: eq(users.id, userId),
  });

  return user ?? null;
}

export async function createPendingTransactionRecord({
  duration,
  grossAmountIdr,
  grossAmountUsd,
  orderId,
  plan,
  userId,
}: CreatePendingTransactionInput): Promise<PendingTransaction> {
  const [transaction] = await db
    .insert(transactions)
    .values({
      duration,
      grossAmountIdr,
      grossAmountUsd,
      orderId,
      plan,
      userId,
    })
    .returning({
      grossAmountIdr: transactions.grossAmountIdr,
      grossAmountUsd: transactions.grossAmountUsd,
      orderId: transactions.orderId,
      plan: transactions.plan,
      snapToken: transactions.snapToken,
    });

  if (!transaction) throw new Error("Unable to create payment transaction.");

  return transaction;
}

export async function attachTransactionSnapToken({
  orderId,
  snapToken,
}: {
  orderId: string;
  snapToken: string;
}): Promise<PendingTransaction | null> {
  const [transaction] = await db
    .update(transactions)
    .set({ snapToken, updatedAt: new Date() })
    .where(eq(transactions.orderId, orderId))
    .returning({
      grossAmountIdr: transactions.grossAmountIdr,
      grossAmountUsd: transactions.grossAmountUsd,
      orderId: transactions.orderId,
      plan: transactions.plan,
      snapToken: transactions.snapToken,
    });

  return transaction ?? null;
}

export async function findPaymentTransactionByOrderId(
  orderId: string,
): Promise<PaymentTransactionForWebhook | null> {
  const [transaction] = await db
    .select({
      duration: transactions.duration,
      grossAmountIdr: transactions.grossAmountIdr,
      grossAmountUsd: transactions.grossAmountUsd,
      orderId: transactions.orderId,
      paidAt: transactions.paidAt,
      paymentMethod: transactions.paymentMethod,
      plan: transactions.plan,
      status: transactions.status,
      userEmail: users.email,
      userId: transactions.userId,
      userName: users.name,
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.userId, users.id))
    .where(eq(transactions.orderId, orderId));

  return transaction ?? null;
}

export async function updatePaymentTransactionStatus({
  expectedStatus,
  orderId,
  paidAt,
  paymentMethod,
  status,
}: UpdatePaymentTransactionStatusInput): Promise<PaymentTransactionForWebhook | null> {
  const [transaction] = await db
    .update(transactions)
    .set({
      ...(paidAt === undefined ? {} : { paidAt }),
      ...(paymentMethod === undefined ? {} : { paymentMethod }),
      status,
      updatedAt: new Date(),
    })
    .where(and(eq(transactions.orderId, orderId), eq(transactions.status, expectedStatus)))
    .returning({
      duration: transactions.duration,
      grossAmountIdr: transactions.grossAmountIdr,
      grossAmountUsd: transactions.grossAmountUsd,
      orderId: transactions.orderId,
      paidAt: transactions.paidAt,
      paymentMethod: transactions.paymentMethod,
      plan: transactions.plan,
      status: transactions.status,
      userId: transactions.userId,
    });

  if (!transaction) return null;

  const user = await db.query.users.findFirst({
    columns: {
      email: true,
      name: true,
    },
    where: eq(users.id, transaction.userId),
  });

  if (!user) return null;

  return {
    ...transaction,
    userEmail: user.email,
    userName: user.name,
  };
}

export async function upsertActiveSubscriptionForUser({
  currentPeriodEnd,
  currentPeriodStart,
  plan,
  userId,
}: {
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  plan: PaidPlan;
  userId: string;
}): Promise<{ id: string }> {
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      currentPeriodEnd,
      currentPeriodStart,
      plan,
      status: "ACTIVE",
      userId,
    })
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        canceledAt: null,
        currentPeriodEnd,
        currentPeriodStart,
        plan,
        status: "ACTIVE",
        updatedAt: new Date(),
      },
    })
    .returning({ id: subscriptions.id });

  if (!subscription) throw new Error("Unable to upsert subscription.");

  return subscription;
}

export async function updateUserPlanForPayment({
  plan,
  userId,
}: {
  plan: PaidPlan;
  userId: string;
}): Promise<{ id: string } | null> {
  const [user] = await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return user ?? null;
}
