import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockUser = {
  avatarUrl: string | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  otpCode: string | null;
  otpExpiresAt: Date | null;
  passwordHash: string | null;
  updatedAt: Date;
};

type InsertUserValues = {
  email: string;
  otpCode: string;
  otpExpiresAt: Date;
  passwordHash: string;
};

type UpdateUserValues = Partial<
  Pick<MockUser, "emailVerified" | "otpCode" | "otpExpiresAt" | "updatedAt">
>;

type SentVerificationEmail = {
  otp: string;
  to: string;
};

type ApiEnvelope = {
  error?: {
    code: string;
  };
  success: boolean;
};

const mockState = vi.hoisted(() => ({
  sentEmails: [] as SentVerificationEmail[],
  users: [] as MockUser[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    delete: () => ({
      where: async () => {
        mockState.users.length = 0;
        return [];
      },
    }),
    insert: () => ({
      values: (values: InsertUserValues) => ({
        returning: async () => {
          const id = "user-1";
          mockState.users.push({
            id,
            email: values.email,
            passwordHash: values.passwordHash,
            otpCode: values.otpCode,
            otpExpiresAt: values.otpExpiresAt,
            emailVerified: null,
            name: null,
            avatarUrl: null,
            updatedAt: new Date("2026-05-06T00:00:00.000Z"),
          });

          return [{ id }];
        },
      }),
    }),
    query: {
      users: {
        findFirst: async () => mockState.users[0] ?? null,
      },
    },
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            const user = mockState.users[0];
            return user ? [user] : [];
          },
        }),
      }),
    }),
    update: () => ({
      set: (values: UpdateUserValues) => ({
        where: async () => {
          const user = mockState.users[0];
          if (user) Object.assign(user, values);
          return [];
        },
      }),
    }),
  },
}));

vi.mock("@/lib/email/auth-emails", () => ({
  sendVerificationEmail: async (message: SentVerificationEmail) => {
    mockState.sentEmails.push(message);
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => ({
    limited: false as const,
    remaining: 99,
  }),
}));

import { POST as registerPost } from "../../src/app/api/v1/auth/register/route";
import { POST as verifyPost } from "../../src/app/api/v1/auth/verify/route";
import {
  authorizeCredentials,
  EmailNotVerifiedError,
} from "../../src/lib/auth/credentials";
import { isProtectedPath } from "../../src/lib/auth/protected-routes";
import { verifyPassword } from "../../src/lib/auth/password";

function createJsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

async function readJson(response: Response): Promise<ApiEnvelope> {
  return response.json() as Promise<ApiEnvelope>;
}

function getOnlyUser(): MockUser {
  const user = mockState.users[0];
  if (!user) throw new Error("Expected test user to exist");
  return user;
}

describe("auth flow", () => {
  beforeEach(() => {
    mockState.sentEmails.length = 0;
    mockState.users.length = 0;
  });

  it("should register verify and login when credentials and otp are valid", async () => {
    const registerResponse = await registerPost(
      createJsonRequest("/api/v1/auth/register", {
        email: " USER@example.com ",
        password: "Password1",
      }),
    );

    expect(registerResponse.status).toBe(201);
    await expect(readJson(registerResponse)).resolves.toEqual({
      success: true,
    });

    const registeredUser = getOnlyUser();
    const issuedOtp = registeredUser.otpCode;

    expect(registeredUser.email).toBe("user@example.com");
    expect(registeredUser.passwordHash).not.toBe("Password1");
    await expect(
      verifyPassword("Password1", registeredUser.passwordHash ?? ""),
    ).resolves.toBe(true);
    expect(mockState.sentEmails).toEqual([
      { to: "user@example.com", otp: issuedOtp },
    ]);

    const verifyResponse = await verifyPost(
      createJsonRequest("/api/v1/auth/verify", {
        email: "user@example.com",
        otp: issuedOtp,
      }),
    );

    expect(verifyResponse.status).toBe(200);
    await expect(readJson(verifyResponse)).resolves.toEqual({
      success: true,
    });

    const verifiedUser = getOnlyUser();
    expect(verifiedUser.emailVerified).toBeInstanceOf(Date);
    expect(verifiedUser.otpCode).toBeNull();
    expect(verifiedUser.otpExpiresAt).toBeNull();

    const authorizedUser = await authorizeCredentials(
      { email: "USER@example.com", password: "Password1" },
      new Request("http://localhost/login", {
        headers: { "x-forwarded-for": "203.0.113.10" },
      }),
    );

    expect(authorizedUser).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: undefined,
      image: undefined,
    });
    expect(isProtectedPath("/links")).toBe(true);
  }, 10_000);

  it("should reject login when registered email is not verified", async () => {
    const registerResponse = await registerPost(
      createJsonRequest("/api/v1/auth/register", {
        email: "user@example.com",
        password: "Password1",
      }),
    );

    expect(registerResponse.status).toBe(201);

    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "Password1" },
        new Request("http://localhost/login"),
      ),
    ).rejects.toBeInstanceOf(EmailNotVerifiedError);
  });
});
