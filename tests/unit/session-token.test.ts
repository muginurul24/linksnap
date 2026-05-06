import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { describe, expect, it } from "vitest";
import {
  applyJwtTokenToSession,
  applyUserToJwtToken,
} from "../../src/lib/auth/session-token";

describe("session token helpers", () => {
  it("should attach user id and google id when jwt callback receives account data", () => {
    const token = applyUserToJwtToken(
      { email: "user@example.com" } as JWT,
      { id: "user-1", email: "user@example.com" } as User,
      { provider: "google", providerAccountId: "google-1" } as Account,
    ) as JWT & { googleId?: string; id?: string };

    expect(token.id).toBe("user-1");
    expect(token.googleId).toBe("google-1");
  });

  it("should attach token id to session when token contains a string id", () => {
    const session = applyJwtTokenToSession(
      {
        expires: "2026-05-06T00:00:00.000Z",
        user: { email: "user@example.com" },
      } as Session,
      { id: "user-1" } as JWT & { id: string },
    ) as Session & { user: NonNullable<Session["user"]> & { id?: string } };

    expect(session.user.id).toBe("user-1");
  });
});
