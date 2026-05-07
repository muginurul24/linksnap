import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  apiKeys,
  campaigns,
  links,
  resetTokens,
  subscriptions,
  transactions,
  users,
} from "@/lib/db/schema";

export type AccountDeletionUser = {
  id: string;
  passwordHash: string | null;
};

export async function findAccountDeletionUserById(
  userId: string,
): Promise<AccountDeletionUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function softDeleteAccount(userId: string): Promise<boolean> {
  const deletedEmail = `deleted-${userId}@deleted.linksnap.local`;
  const now = new Date();

  return db.transaction(async (tx) => {
    await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
    await tx.delete(resetTokens).where(eq(resetTokens.userId, userId));
    await tx.delete(transactions).where(eq(transactions.userId, userId));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await tx.delete(campaigns).where(eq(campaigns.userId, userId));
    await tx.delete(links).where(eq(links.userId, userId));

    const [user] = await tx
      .update(users)
      .set({
        avatarUrl: null,
        deletedAt: now,
        email: deletedEmail,
        emailVerified: null,
        googleId: null,
        name: null,
        otpCode: null,
        otpExpiresAt: null,
        passwordHash: null,
        refreshTokenHash: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return Boolean(user);
  });
}
