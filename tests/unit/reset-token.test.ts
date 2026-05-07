import { describe, expect, it } from "vitest";
import {
  generateResetToken,
  getResetTokenExpiresAt,
  hashResetToken,
  isResetTokenExpired,
} from "../../src/lib/auth/reset-token";

describe("password reset token helpers", () => {
  it("should generate a high-entropy URL safe token", () => {
    const token = generateResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(43);
  });

  it("should hash tokens before persistence", () => {
    const token = "reset-token";
    const hash = hashResetToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hashResetToken(token)).toBe(hash);
  });

  it("should set and evaluate a one-hour expiry window", () => {
    const now = new Date("2026-05-07T00:00:00.000Z");
    const expiresAt = getResetTokenExpiresAt(now);

    expect(expiresAt).toEqual(new Date("2026-05-07T01:00:00.000Z"));
    expect(isResetTokenExpired(expiresAt, now)).toBe(false);
    expect(isResetTokenExpired(expiresAt, expiresAt)).toBe(true);
  });
});
