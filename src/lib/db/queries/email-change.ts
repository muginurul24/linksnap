import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type EmailChangeUser = {
  email: string;
  id: string;
  passwordHash: string | null;
};

export async function findEmailChangeUserById(
  userId: string,
): Promise<EmailChangeUser | null> {
  const [user] = await db
    .select({
      email: users.email,
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user?.id ?? null;
}

export async function updateUserEmail({
  email,
  userId,
}: {
  email: string;
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({
      email,
      emailVerified: new Date(),
      otpCode: null,
      otpExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}
