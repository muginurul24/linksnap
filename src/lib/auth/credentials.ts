import { CredentialsSignin } from "@auth/core/errors";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { verifyPassword } from "@/lib/auth/password";
import { getRequestIp } from "@/lib/auth/request-ip";
import {
  deleteTwoFactorChallenge,
  getTwoFactorChallenge,
} from "@/lib/auth/two-factor-challenge";
import {
  consumeBackupCode,
  verifyTotpToken,
} from "@/lib/auth/two-factor";
import {
  findTwoFactorLoginUserByEmail,
  findTwoFactorLoginUserById,
  replaceTwoFactorBackupCodes,
  type TwoFactorLoginUser,
} from "@/lib/db/queries/two-factor";

type CredentialsInput = Partial<
  Record<"backupCode" | "challengeId" | "email" | "password" | "totpToken", unknown>
>;

export type AuthorizedCredentialsUser = {
  email: string;
  id: string;
  image?: string;
  name?: string;
};

export class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

export class TwoFactorRequiredError extends CredentialsSignin {
  code = "two_factor_required";
}

function normalizeCredentialEmail(email: unknown): string | null {
  return typeof email === "string" ? email.trim().toLowerCase() : null;
}

function getCredentialPassword(password: unknown): string | null {
  return typeof password === "string" ? password : null;
}

function getCredentialString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toAuthorizedCredentialsUser(
  user: TwoFactorLoginUser,
): AuthorizedCredentialsUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? undefined,
    image: user.avatarUrl ?? undefined,
  };
}

async function authorizeChallengeCredentials(
  credentials: CredentialsInput,
): Promise<AuthorizedCredentialsUser | null> {
  const challengeId = getCredentialString(credentials.challengeId);
  if (!challengeId) return null;

  const challenge = await getTwoFactorChallenge(challengeId);
  if (!challenge) return null;

  const user = await findTwoFactorLoginUserById(challenge.userId);
  if (!user?.emailVerified || user.deletedAt) return null;

  if (challenge.kind === "password") {
    await deleteTwoFactorChallenge(challengeId);
    return toAuthorizedCredentialsUser(user);
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) return null;

  const totpToken = getCredentialString(credentials.totpToken);
  if (totpToken) {
    const valid = verifyTotpToken({
      secret: user.twoFactorSecret,
      token: totpToken,
    });

    if (!valid) return null;

    await deleteTwoFactorChallenge(challengeId);
    return toAuthorizedCredentialsUser(user);
  }

  const backupCode = getCredentialString(credentials.backupCode);
  if (!backupCode) return null;

  const backupResult = consumeBackupCode({
    code: backupCode,
    hashes: user.twoFactorBackupCodeHashes,
  });

  if (!backupResult.valid) return null;

  const updated = await replaceTwoFactorBackupCodes({
    backupCodeHashes: backupResult.remainingHashes,
    userId: user.id,
  });

  if (!updated) return null;

  await deleteTwoFactorChallenge(challengeId);
  return toAuthorizedCredentialsUser(user);
}

export async function authorizeCredentials(
  credentials: CredentialsInput | undefined,
  request: Request,
): Promise<AuthorizedCredentialsUser | null> {
  if (credentials?.challengeId) {
    return authorizeChallengeCredentials(credentials);
  }

  const email = normalizeCredentialEmail(credentials?.email);
  const password = getCredentialPassword(credentials?.password);

  if (!email || !password) return null;

  const rateLimit = await slidingWindowRateLimit({
    key: `auth:login:${getRequestIp(request)}`,
    limit: 5,
    windowSeconds: 15 * 60,
  });

  if (rateLimit.limited) return null;

  const user = await findTwoFactorLoginUserByEmail(email);

  if (!user?.passwordHash || user.deletedAt) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    throw new TwoFactorRequiredError();
  }

  return toAuthorizedCredentialsUser(user);
}
