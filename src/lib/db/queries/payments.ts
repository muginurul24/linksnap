import { and, count, desc, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { subscriptions, transactions, users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

export type PaymentStatus = typeof transactions.$inferSelect["status"];
export type SubscriptionRecord = typeof subscriptions.$inferSelect;

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

export type ExpiredSubscriptionCandidate = {
  id: string;
  userId: string;
};

export type BillingTransaction = {
  createdAt: Date;
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  id: string;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: PaymentStatus;
  updatedAt: Date;
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

type ListPaymentTransactionsInput = {
  limit: number;
  page: number;
  userId: string;
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

export async function findSubscriptionByUserId(
  userId: string,
): Promise<SubscriptionRecord | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.userId, userId),
  });

  return subscription ?? null;
}

export async function expireSubscriptionForUser({
  expiredAt,
  userId,
}: {
  expiredAt: Date;
  userId: string;
}): Promise<{ id: string } | null> {
  const [subscription] = await db
    .update(subscriptions)
    .set({
      canceledAt: expiredAt,
      status: "EXPIRED",
      updatedAt: new Date(),
    })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "ACTIVE")))
    .returning({ id: subscriptions.id });

  return subscription ?? null;
}

export async function listExpiredActiveSubscriptions({
  limit,
  now,
}: {
  limit: number;
  now: Date;
}): Promise<ExpiredSubscriptionCandidate[]> {
  return db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "ACTIVE"),
        lte(subscriptions.currentPeriodEnd, now),
      ),
    )
    .limit(limit);
}

export async function expireSubscriptionsByIds({
  expiredAt,
  ids,
}: {
  expiredAt: Date;
  ids: string[];
}): Promise<number> {
  if (ids.length === 0) return 0;

  const expired = await db
    .update(subscriptions)
    .set({
      canceledAt: expiredAt,
      status: "EXPIRED",
      updatedAt: new Date(),
    })
    .where(inArray(subscriptions.id, ids))
    .returning({ id: subscriptions.id });

  return expired.length;
}

export async function updateUserPlanForSubscription({
  plan,
  userId,
}: {
  plan: UserPlan;
  userId: string;
}): Promise<{ id: string } | null> {
  const [user] = await db
    .update(users)
    .set({ plan, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return user ?? null;
}

export async function updateUserPlansToFree(userIds: string[]): Promise<number> {
  if (userIds.length === 0) return 0;

  const updated = await db
    .update(users)
    .set({ plan: "FREE", updatedAt: new Date() })
    .where(inArray(users.id, userIds))
    .returning({ id: users.id });

  return updated.length;
}

export async function listPaymentTransactionsByUserId({
  limit,
  page,
  userId,
}: ListPaymentTransactionsInput): Promise<{
  items: BillingTransaction[];
  total: number;
}> {
  const offset = (page - 1) * limit;
  const [items, totalRows] = await Promise.all([
    db
      .select({
        createdAt: transactions.createdAt,
        duration: transactions.duration,
        grossAmountIdr: transactions.grossAmountIdr,
        grossAmountUsd: transactions.grossAmountUsd,
        id: transactions.id,
        orderId: transactions.orderId,
        paidAt: transactions.paidAt,
        paymentMethod: transactions.paymentMethod,
        plan: transactions.plan,
        status: transactions.status,
        updatedAt: transactions.updatedAt,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(transactions)
      .where(eq(transactions.userId, userId)),
  ]);

  return {
    items,
    total: totalRows[0]?.value ?? 0,
  };
}
