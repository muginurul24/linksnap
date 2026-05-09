import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { retryTransientDbQuery } from "@/lib/db/retry";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  users,
  type UserNotificationPreferences,
} from "@/lib/db/schema";

export type SettingsUser = {
  email: string;
  name: string | null;
  notifications: UserNotificationPreferences;
  twoFactorEnabled: boolean;
};

export type PasswordUser = {
  id: string;
  passwordHash: string | null;
};

export function normalizeNotificationPreferences(
  value: UserNotificationPreferences | null,
): UserNotificationPreferences {
  return value ?? DEFAULT_NOTIFICATION_PREFERENCES;
}

export async function findSettingsUserById(
  userId: string,
): Promise<SettingsUser | null> {
  const user = await db.query.users.findFirst({
    columns: {
      email: true,
      name: true,
      notifications: true,
      twoFactorEnabled: true,
    },
    where: eq(users.id, userId),
  });

  if (!user) return null;

  return {
    email: user.email,
    name: user.name,
    notifications: normalizeNotificationPreferences(user.notifications),
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

export async function updateSettingsUserProfile({
  name,
  userId,
}: {
  name: string | null;
  userId: string;
}): Promise<SettingsUser | null> {
  const [user] = await retryTransientDbQuery(() =>
    db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({
        email: users.email,
        name: users.name,
        notifications: users.notifications,
        twoFactorEnabled: users.twoFactorEnabled,
      }),
  );

  if (!user) return null;

  return {
    email: user.email,
    name: user.name,
    notifications: normalizeNotificationPreferences(user.notifications),
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

export async function updateSettingsUserNotifications({
  notifications,
  userId,
}: {
  notifications: UserNotificationPreferences;
  userId: string;
}): Promise<UserNotificationPreferences | null> {
  const [user] = await retryTransientDbQuery(() =>
    db
      .update(users)
      .set({ notifications, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ notifications: users.notifications }),
  );

  return user ? normalizeNotificationPreferences(user.notifications) : null;
}

export async function findPasswordUserById(
  userId: string,
): Promise<PasswordUser | null> {
  const user = await db.query.users.findFirst({
    columns: {
      id: true,
      passwordHash: true,
    },
    where: eq(users.id, userId),
  });

  return user ?? null;
}

export async function updateUserPasswordHash({
  passwordHash,
  userId,
}: {
  passwordHash: string;
  userId: string;
}): Promise<boolean> {
  const [user] = await retryTransientDbQuery(() =>
    db
      .update(users)
      .set({
        passwordHash,
        refreshTokenHash: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id }),
  );

  return Boolean(user);
}
