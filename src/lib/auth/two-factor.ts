import { createHash, randomBytes } from "node:crypto";
import * as OTPAuth from "otpauth";

const ISSUER = "LinkSnap";
const BACKUP_CODE_COUNT = 8;
const BACKUP_CODE_BYTES = 4;
const TOKEN_PATTERN = /^\d{6}$/;

export type BackupCodeSet = {
  codes: string[];
  hashes: string[];
};

function normalizeBackupCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function createTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export function createTotpUri({
  email,
  secret,
}: {
  email: string;
  secret: string;
}): string {
  return new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    issuer: ISSUER,
    label: email,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  }).toString();
}

export function generateTotpToken({
  secret,
  timestamp,
}: {
  secret: string;
  timestamp?: number;
}): string {
  return new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    issuer: ISSUER,
    label: "test",
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  }).generate({ timestamp });
}

export function verifyTotpToken({
  secret,
  timestamp,
  token,
}: {
  secret: string;
  timestamp?: number;
  token: string;
}): boolean {
  const normalizedToken = token.trim();
  if (!TOKEN_PATTERN.test(normalizedToken)) return false;

  const delta = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    issuer: ISSUER,
    label: "LinkSnap",
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  }).validate({ timestamp, token: normalizedToken, window: 1 });

  return delta !== null;
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function generateBackupCodes(): BackupCodeSet {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = randomBytes(BACKUP_CODE_BYTES).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });

  return {
    codes,
    hashes: codes.map(hashBackupCode),
  };
}

export function consumeBackupCode({
  code,
  hashes,
}: {
  code: string;
  hashes: string[];
}): { remainingHashes: string[]; valid: true } | { valid: false } {
  const codeHash = hashBackupCode(code);
  const index = hashes.indexOf(codeHash);

  if (index === -1) return { valid: false };

  return {
    remainingHashes: hashes.filter((_, currentIndex) => currentIndex !== index),
    valid: true,
  };
}
