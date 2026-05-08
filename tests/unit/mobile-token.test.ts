import { describe, expect, it } from "vitest";
import {
  createMobileAccessToken,
  hashMobileRefreshToken,
  verifyMobileAccessToken,
} from "../../src/lib/auth/mobile-token";

const AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-chars";

describe("mobile token", () => {
  it("should sign and verify a mobile access token", () => {
    process.env.AUTH_SECRET = AUTH_SECRET;

    const token = createMobileAccessToken(
      {
        email: "user@example.com",
        id: "user-1",
        plan: "PRO",
        role: "user",
      },
      new Date("2026-05-08T00:00:00.000Z"),
    );

    expect(
      verifyMobileAccessToken(token, new Date("2026-05-08T00:05:00.000Z")),
    ).toMatchObject({
      email: "user@example.com",
      plan: "PRO",
      role: "user",
      sub: "user-1",
    });
  });

  it("should reject expired or tampered access tokens", () => {
    process.env.AUTH_SECRET = AUTH_SECRET;

    const token = createMobileAccessToken(
      {
        email: "user@example.com",
        id: "user-1",
        plan: "FREE",
        role: "user",
      },
      new Date("2026-05-08T00:00:00.000Z"),
    );

    expect(
      verifyMobileAccessToken(token, new Date("2026-05-08T00:16:00.000Z")),
    ).toBeNull();
    expect(
      verifyMobileAccessToken(`${token.slice(0, -2)}xx`, new Date("2026-05-08T00:05:00.000Z")),
    ).toBeNull();
  });

  it("should hash refresh tokens deterministically without storing raw values", () => {
    const token = "refresh-token-value";

    expect(hashMobileRefreshToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashMobileRefreshToken(token)).toBe(hashMobileRefreshToken(token));
    expect(hashMobileRefreshToken(token)).not.toBe(token);
  });
});
