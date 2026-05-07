import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type TwoFactorLoginUser = {
  avatarUrl: string | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  twoFactorBackupCodeHashes: string[];
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

const loginUserColumns = {
  avatarUrl: users.avatarUrl,
  email: users.email,
  emailVerified: users.emailVerified,
  id: users.id,
  name: users.name,
  passwordHash: users.passwordHash,
  twoFactorBackupCodeHashes: users.twoFactorBackupCodeHashes,
  twoFactorEnabled: users.twoFactorEnabled,
  twoFactorSecret: users.twoFactorSecret,
};

export async function findTwoFactorLoginUserByEmail(
  email: string,
): Promise<TwoFactorLoginUser | null> {
  const [user] = await db
    .select(loginUserColumns)
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function findTwoFactorLoginUserById(
  userId: string,
): Promise<TwoFactorLoginUser | null> {
  const [user] = await db
    .select(loginUserColumns)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function saveTwoFactorSetupSecret({
  secret,
  userId,
}: {
  secret: string;
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({
      twoFactorBackupCodeHashes: [],
      twoFactorEnabled: false,
      twoFactorSecret: secret,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}

export async function enableTwoFactor({
  backupCodeHashes,
  userId,
}: {
  backupCodeHashes: string[];
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({
      twoFactorBackupCodeHashes: backupCodeHashes,
      twoFactorEnabled: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}

export async function disableTwoFactor(userId: string): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({
      twoFactorBackupCodeHashes: [],
      twoFactorEnabled: false,
      twoFactorSecret: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}

export async function replaceTwoFactorBackupCodes({
  backupCodeHashes,
  userId,
}: {
  backupCodeHashes: string[];
  userId: string;
}): Promise<boolean> {
  const [user] = await db
    .update(users)
    .set({
      twoFactorBackupCodeHashes: backupCodeHashes,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return Boolean(user);
}
