import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserPlan } from "@/lib/links/limits";

export type MobileAuthUser = {
  avatarUrl: string | null;
  deletedAt: Date | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  plan: UserPlan;
  refreshTokenHash: string | null;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

const mobileAuthUserColumns = {
  avatarUrl: users.avatarUrl,
  deletedAt: users.deletedAt,
  email: users.email,
  emailVerified: users.emailVerified,
  id: users.id,
  name: users.name,
  passwordHash: users.passwordHash,
  plan: users.plan,
  refreshTokenHash: users.refreshTokenHash,
  role: users.role,
  twoFactorEnabled: users.twoFactorEnabled,
  twoFactorSecret: users.twoFactorSecret,
};

export async function findMobileLoginUserByEmail(
  email: string,
): Promise<MobileAuthUser | null> {
  const [user] = await db
    .select(mobileAuthUserColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function findMobileSessionUserById(
  userId: string,
): Promise<MobileAuthUser | null> {
  const [user] = await db
    .select(mobileAuthUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function findMobileRefreshUserByHash(
  refreshTokenHash: string,
): Promise<MobileAuthUser | null> {
  const [user] = await db
    .select(mobileAuthUserColumns)
    .from(users)
    .where(eq(users.refreshTokenHash, refreshTokenHash))
    .limit(1);

  return user ?? null;
}

export async function saveMobileRefreshTokenHash({
  refreshTokenHash,
  userId,
}: {
  refreshTokenHash: string;
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({ refreshTokenHash, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}

export async function clearMobileRefreshTokenHash({
  userId,
}: {
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({ refreshTokenHash: null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}
