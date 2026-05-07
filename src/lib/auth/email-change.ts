import { cacheDelete, cacheGet, cacheSet } from "@/lib/redis";

const EMAIL_CHANGE_TTL_SECONDS = 10 * 60;

export type PendingEmailChange = {
  email: string;
  otp: string;
};

function getPendingEmailChangeKey(userId: string): string {
  return `auth:change-email:${userId}`;
}

export async function createPendingEmailChange({
  email,
  otp,
  userId,
}: PendingEmailChange & { userId: string }): Promise<void> {
  await cacheSet(
    getPendingEmailChangeKey(userId),
    { email, otp },
    EMAIL_CHANGE_TTL_SECONDS,
  );
}

export async function getPendingEmailChange(
  userId: string,
): Promise<PendingEmailChange | null> {
  return cacheGet<PendingEmailChange>(getPendingEmailChangeKey(userId));
}

export async function deletePendingEmailChange(userId: string): Promise<void> {
  await cacheDelete(getPendingEmailChangeKey(userId));
}
