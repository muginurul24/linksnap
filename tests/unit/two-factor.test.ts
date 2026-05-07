import { describe, expect, it } from "vitest";
import {
  consumeBackupCode,
  createTotpSecret,
  createTotpUri,
  generateBackupCodes,
  generateTotpToken,
  hashBackupCode,
  verifyTotpToken,
} from "../../src/lib/auth/two-factor";

describe("two-factor auth helpers", () => {
  it("should generate a TOTP secret and otpauth URL", () => {
    const secret = createTotpSecret();
    const uri = createTotpUri({ email: "user@example.com", secret });

    expect(secret).toMatch(/^[A-Z2-7]+=*$/);
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=LinkSnap");
  });

  it("should verify valid TOTP tokens and reject invalid tokens", () => {
    const secret = createTotpSecret();
    const timestamp = Date.parse("2026-05-07T00:00:00.000Z");
    const token = generateTotpToken({ secret, timestamp });

    expect(verifyTotpToken({ secret, timestamp, token })).toBe(true);
    expect(verifyTotpToken({ secret, timestamp, token: "000000" })).toBe(false);
    expect(verifyTotpToken({ secret, timestamp, token: "abc123" })).toBe(false);
  });

  it("should generate hashed backup codes and consume one code once", () => {
    const backupCodes = generateBackupCodes();

    expect(backupCodes.codes).toHaveLength(8);
    expect(backupCodes.hashes).toHaveLength(8);
    expect(backupCodes.hashes).toContain(hashBackupCode(backupCodes.codes[0]));
    expect(backupCodes.hashes).not.toContain(backupCodes.codes[0]);

    const consumed = consumeBackupCode({
      code: backupCodes.codes[0],
      hashes: backupCodes.hashes,
    });

    expect(consumed.valid).toBe(true);
    if (!consumed.valid) return;
    expect(consumed.remainingHashes).toHaveLength(7);
    expect(
      consumeBackupCode({
        code: backupCodes.codes[0],
        hashes: consumed.remainingHashes,
      }).valid,
    ).toBe(false);
  });
});
