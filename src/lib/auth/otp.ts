import { randomInt } from "node:crypto";

export const OTP_TTL_MINUTES = 10;

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function getOtpExpiresAt(now = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
}

export function isOtpExpired(expiresAt: Date | null, now = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() <= now.getTime();
}
