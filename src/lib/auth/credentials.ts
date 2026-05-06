import { CredentialsSignin } from "@auth/core/errors";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { getRequestIp } from "@/lib/auth/request-ip";

type CredentialsInput = Partial<Record<"email" | "password", unknown>>;

export type AuthorizedCredentialsUser = {
  email: string;
  id: string;
  image?: string;
  name?: string;
};

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

function normalizeCredentialEmail(email: unknown): string | null {
  return typeof email === "string" ? email.trim().toLowerCase() : null;
}

function getCredentialPassword(password: unknown): string | null {
  return typeof password === "string" ? password : null;
}

export async function authorizeCredentials(
  credentials: CredentialsInput | undefined,
  request: Request,
): Promise<AuthorizedCredentialsUser | null> {
  const email = normalizeCredentialEmail(credentials?.email);
  const password = getCredentialPassword(credentials?.password);

  if (!email || !password) return null;

  const rateLimit = await slidingWindowRateLimit({
    key: `auth:login:${getRequestIp(request)}`,
    limit: 5,
    windowSeconds: 15 * 60,
  });

  if (rateLimit.limited) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    image: user.avatarUrl ?? undefined,
  };
}
