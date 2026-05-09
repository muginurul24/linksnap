import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type ApiEnvelope =
  | { success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const USER_ID = "00000000-0000-4000-8000-000000000001";

const mockState = vi.hoisted(() => ({
  passwordHash: null as string | null,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "00000000-0000-4000-8000-000000000001" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () =>
    mockState.session
      ? { email: "user@example.com", name: "User", plan: "FREE" }
      : null,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/settings", () => ({
  findPasswordUserById: async (userId: string) =>
    userId === USER_ID ? { id: USER_ID, passwordHash: mockState.passwordHash } : null,
  updateUserPasswordHash: async ({
    passwordHash,
    userId,
  }: {
    passwordHash: string;
    userId: string;
  }) => {
    if (userId !== USER_ID) return false;
    mockState.passwordHash = passwordHash;
    return true;
  },
}));

import { POST } from "../../src/app/api/v1/auth/change-password/route";

function createJsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/v1/auth/change-password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

async function readJson(response: Response): Promise<ApiEnvelope> {
  return response.json() as Promise<ApiEnvelope>;
}

describe("change password API", () => {
  beforeEach(async () => {
    mockState.passwordHash = await hashPassword("Current1");
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: USER_ID } };
  });

  it("should update password hash when current password is valid", async () => {
    const response = await POST(
      createJsonRequest({
        confirmPassword: "Newpass1",
        currentPassword: "Current1",
        password: "Newpass1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    await expect(verifyPassword("Newpass1", mockState.passwordHash ?? "")).resolves.toBe(
      true,
    );
    await expect(
      verifyPassword("Current1", mockState.passwordHash ?? ""),
    ).resolves.toBe(false);
  }, 10_000);

  it("should reject an invalid current password", async () => {
    const response = await POST(
      createJsonRequest({
        confirmPassword: "Newpass1",
        currentPassword: "Wrongpass1",
        password: "Newpass1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  it("should reject password changes for accounts without a password hash", async () => {
    mockState.passwordHash = null;

    const response = await POST(
      createJsonRequest({
        confirmPassword: "Newpass1",
        currentPassword: "Current1",
        password: "Newpass1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PASSWORD_CHANGE_UNAVAILABLE");
  });

  it("should reject invalid password change input", async () => {
    const response = await POST(
      createJsonRequest({
        confirmPassword: "Different1",
        currentPassword: "Current1",
        password: "Newpass1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unauthenticated password changes", async () => {
    mockState.session = null;

    const response = await POST(
      createJsonRequest({
        confirmPassword: "Newpass1",
        currentPassword: "Current1",
        password: "Newpass1",
      }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
