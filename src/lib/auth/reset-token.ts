import { createHash, randomBytes } from "node:crypto";

export const RESET_TOKEN_TTL_MINUTES = 60;

export function generateResetToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getResetTokenExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);
}

export function isResetTokenExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}
