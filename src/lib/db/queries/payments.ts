import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

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

type CreatePendingTransactionInput = {
  duration: PaymentDuration;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: PaidPlan;
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
