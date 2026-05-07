import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashResetToken } from "../../src/lib/auth/reset-token";

type MockUser = {
  avatarUrl: string | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  refreshTokenHash: string | null;
  updatedAt: Date;
};

type MockResetToken = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  tokenHash: string;
  usedAt: Date | null;
  userId: string;
};

type InsertResetTokenValues = {
  expiresAt: Date;
  tokenHash: string;
  userId: string;
};

type UpdateValues = Partial<MockUser & MockResetToken>;

type SentResetEmail = {
  resetUrl: string;
  to: string;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type ApiEnvelope = {
  error?: {
    code: string;
  };
  success: boolean;
};

const mockState = vi.hoisted(() => ({
  rateLimitOptions: [] as RateLimitOptions[],
  resetTokens: [] as MockResetToken[],
  sentResetEmails: [] as SentResetEmail[],
  users: [] as MockUser[],
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: (values: InsertResetTokenValues) => ({
        returning: async () => {
          const id = `reset-token-${mockState.resetTokens.length + 1}`;
          mockState.resetTokens.push({
            id,
            userId: values.userId,
            tokenHash: values.tokenHash,
            expiresAt: values.expiresAt,
            usedAt: null,
            createdAt: new Date("2026-05-07T00:00:00.000Z"),
          });

          return [{ id }];
        },
      }),
    }),
    query: {
      resetTokens: {
        findFirst: async () => mockState.resetTokens[0] ?? null,
      },
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
      set: (values: UpdateValues) => ({
        where: async () => {
          if ("passwordHash" in values) {
            const user = mockState.users[0];
            if (user) Object.assign(user, values);
            return [];
          }

          if ("usedAt" in values) {
            for (const token of mockState.resetTokens) {
              if (!token.usedAt) Object.assign(token, values);
            }
          }

          return [];
        },
      }),
    }),
  },
}));

vi.mock("@/lib/email/auth-emails", () => ({
  sendPasswordResetEmail: async (message: SentResetEmail) => {
    mockState.sentResetEmails.push(message);
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return { limited: false as const, remaining: 99 };
  },
}));

import { POST as forgotPasswordPost } from "../../src/app/api/v1/auth/forgot-password/route";
import { POST as resetPasswordPost } from "../../src/app/api/v1/auth/reset-password/route";
import { authorizeCredentials } from "../../src/lib/auth/credentials";
import { hashPassword } from "../../src/lib/auth/password";

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

function getResetTokenFromEmail(): string {
  const resetUrl = mockState.sentResetEmails[0]?.resetUrl;
  if (!resetUrl) throw new Error("Expected reset email to be sent");
  return new URL(resetUrl).searchParams.get("token") ?? "";
}

describe("forgot and reset password flow", () => {
  beforeEach(async () => {
    mockState.rateLimitOptions.length = 0;
    mockState.resetTokens.length = 0;
    mockState.sentResetEmails.length = 0;
    mockState.users = [
      {
        id: "user-1",
        email: "user@example.com",
        passwordHash: await hashPassword("Password1"),
        refreshTokenHash: "old-refresh-token",
        emailVerified: new Date("2026-05-07T00:00:00.000Z"),
        name: null,
        avatarUrl: null,
        updatedAt: new Date("2026-05-07T00:00:00.000Z"),
      },
    ];
  });

  it("should issue a reset link and update credentials when token is valid", async () => {
    const forgotResponse = await forgotPasswordPost(
      createJsonRequest("/api/v1/auth/forgot-password", {
        email: " USER@example.com ",
      }),
    );

    expect(forgotResponse.status).toBe(200);
    await expect(readJson(forgotResponse)).resolves.toEqual({ success: true });

    const token = getResetTokenFromEmail();
    expect(mockState.sentResetEmails).toHaveLength(1);
    expect(mockState.sentResetEmails[0]).toMatchObject({
      to: "user@example.com",
    });
    expect(mockState.resetTokens[0]).toMatchObject({
      userId: "user-1",
      tokenHash: hashResetToken(token),
      usedAt: null,
    });
    expect(mockState.resetTokens[0]?.tokenHash).not.toBe(token);
    expect(mockState.rateLimitOptions).toContainEqual({
      key: "auth:forgot-password:user@example.com",
      limit: 3,
      windowSeconds: 60 * 60,
    });

    const resetResponse = await resetPasswordPost(
      createJsonRequest("/api/v1/auth/reset-password", {
        token,
        password: "NewPassword1",
        confirmPassword: "NewPassword1",
      }),
    );

    expect(resetResponse.status).toBe(200);
    await expect(readJson(resetResponse)).resolves.toEqual({ success: true });
    expect(mockState.resetTokens[0]?.usedAt).toBeInstanceOf(Date);
    expect(mockState.users[0]?.refreshTokenHash).toBeNull();

    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "NewPassword1" },
        new Request("http://localhost/login"),
      ),
    ).resolves.toMatchObject({
      id: "user-1",
      email: "user@example.com",
    });

    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "Password1" },
        new Request("http://localhost/login"),
      ),
    ).resolves.toBeNull();
  });

  it("should not reveal whether an email exists", async () => {
    mockState.users.length = 0;

    const response = await forgotPasswordPost(
      createJsonRequest("/api/v1/auth/forgot-password", {
        email: "missing@example.com",
      }),
    );

    expect(response.status).toBe(200);
    await expect(readJson(response)).resolves.toEqual({ success: true });
    expect(mockState.sentResetEmails).toEqual([]);
    expect(mockState.resetTokens).toEqual([]);
  });

  it("should reject expired or already used reset tokens", async () => {
    const expiredToken = "expired-token-value-with-enough-length-1234567890";

    mockState.resetTokens = [
      {
        id: "reset-token-1",
        userId: "user-1",
        tokenHash: hashResetToken(expiredToken),
        expiresAt: new Date("2026-05-07T00:00:00.000Z"),
        usedAt: null,
        createdAt: new Date("2026-05-06T23:00:00.000Z"),
      },
    ];

    const response = await resetPasswordPost(
      createJsonRequest("/api/v1/auth/reset-password", {
        token: expiredToken,
        password: "NewPassword1",
        confirmPassword: "NewPassword1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "INVALID_RESET_TOKEN" },
    });
  });
});
