import { describe, expect, it } from "vitest";
import {
  generateOtp,
  getOtpExpiresAt,
  isOtpExpired,
  OTP_TTL_MINUTES,
} from "../../src/lib/auth/otp";

describe("otp helpers", () => {
  it("should generate six numeric digits when creating an otp", () => {
    expect(generateOtp()).toMatch(/^\d{6}$/);
  });

  it("should set otp expiry when generated from a known time", () => {
    const now = new Date("2026-05-06T00:00:00.000Z");
    const expiresAt = getOtpExpiresAt(now);

    expect(expiresAt.getTime() - now.getTime()).toBe(
      OTP_TTL_MINUTES * 60 * 1000,
    );
  });

  it("should mark otp expired when expiry is missing or in the past", () => {
    const now = new Date("2026-05-06T00:10:00.000Z");

    expect(isOtpExpired(null, now)).toBe(true);
    expect(isOtpExpired(new Date("2026-05-06T00:09:59.000Z"), now)).toBe(true);
    expect(isOtpExpired(new Date("2026-05-06T00:10:01.000Z"), now)).toBe(false);
  });
});
