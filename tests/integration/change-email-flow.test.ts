import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../src/lib/auth/password";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockUser = {
  email: string;
  id: string;
  passwordHash: string | null;
};

type SentVerificationEmail = {
  otp: string;
  to: string;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const USER_ID = "00000000-0000-4000-8000-000000000001";

const mockState = vi.hoisted(() => ({
  cache: new Map<string, string>(),
  existingEmails: new Map<string, string>(),
  sentEmails: [] as SentVerificationEmail[],
  session: { user: { id: "00000000-0000-4000-8000-000000000001" } } as MockSession,
  user: null as MockUser | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    mockState.cache.delete(`linksnap:${key}`);
  },
  cacheGet: async <T>(key: string): Promise<T | null> => {
    const value = mockState.cache.get(`linksnap:${key}`);
    return value ? (JSON.parse(value) as T) : null;
  },
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(`linksnap:${key}`, JSON.stringify(value));
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => ({
    limited: false as const,
    remaining: 99,
  }),
}));

vi.mock("@/lib/email/auth-emails", () => ({
  sendVerificationEmail: async (message: SentVerificationEmail) => {
    mockState.sentEmails.push(message);
  },
}));

vi.mock("@/lib/db/queries/email-change", () => ({
  findEmailChangeUserById: async (userId: string) =>
    mockState.user?.id === userId ? mockState.user : null,
  findUserIdByEmail: async (email: string) =>
    mockState.user?.email === email
      ? mockState.user.id
      : mockState.existingEmails.get(email) ?? null,
  updateUserEmail: async ({
    email,
    userId,
  }: {
    email: string;
    userId: string;
  }) => {
    if (!mockState.user || mockState.user.id !== userId) return false;
    mockState.user.email = email;
    return true;
  },
}));

import { POST as changeEmailPost } from "../../src/app/api/v1/auth/change-email/route";
import { POST as verifyNewEmailPost } from "../../src/app/api/v1/auth/verify-new-email/route";

function createJsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost:3000${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    method: "POST",
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("change email flow", () => {
  beforeEach(async () => {
    mockState.cache.clear();
    mockState.existingEmails.clear();
    mockState.sentEmails.length = 0;
    mockState.session = { user: { id: USER_ID } };
    mockState.user = {
      email: "old@example.com",
      id: USER_ID,
      passwordHash: await hashPassword("Password1"),
    };
  });

  it("should send an OTP to the new email and update email after verification", async () => {
    const changeResponse = await changeEmailPost(
      createJsonRequest("/api/v1/auth/change-email", {
        email: " NEW@example.com ",
        password: "Password1",
      }),
    );
    const changeBody = await readJson<{ email: string }>(changeResponse);

    expect(changeResponse.status).toBe(200);
    expect(changeBody.success).toBe(true);
    if (!changeBody.success) return;
    expect(changeBody.data.email).toBe("new@example.com");
    expect(mockState.sentEmails).toHaveLength(1);
    expect(mockState.sentEmails[0].to).toBe("new@example.com");
    expect(mockState.user?.email).toBe("old@example.com");

    const verifyResponse = await verifyNewEmailPost(
      createJsonRequest("/api/v1/auth/verify-new-email", {
        email: "new@example.com",
        otp: mockState.sentEmails[0].otp,
      }),
    );
    const verifyBody = await readJson<{ email: string }>(verifyResponse);

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.success).toBe(true);
    if (!verifyBody.success) return;
    expect(verifyBody.data.email).toBe("new@example.com");
    expect(mockState.user?.email).toBe("new@example.com");
  });

  it("should reject duplicate new email addresses", async () => {
    mockState.existingEmails.set("taken@example.com", "other-user");

    const response = await changeEmailPost(
      createJsonRequest("/api/v1/auth/change-email", {
        email: "taken@example.com",
        password: "Password1",
      }),
    );
    const body = await readJson<{ email: string }>(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    expect(mockState.sentEmails).toEqual([]);
  });
});
