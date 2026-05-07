import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../src/lib/auth/password";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockUser = {
  avatarUrl: string | null;
  deletedAt: Date | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  twoFactorBackupCodeHashes: string[];
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

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
  session: { user: { id: "00000000-0000-4000-8000-000000000001" } } as MockSession,
  user: null as MockUser | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => ({
    limited: false as const,
    remaining: 99,
  }),
}));

vi.mock("@/lib/db/queries/account-deletion", () => ({
  findAccountDeletionUserById: async (userId: string) =>
    mockState.user?.id === userId
      ? { id: mockState.user.id, passwordHash: mockState.user.passwordHash }
      : null,
  softDeleteAccount: async (userId: string) => {
    if (!mockState.user || mockState.user.id !== userId) return false;
    mockState.user.deletedAt = new Date("2026-05-07T00:00:00.000Z");
    mockState.user.email = `deleted-${userId}@deleted.linksnap.local`;
    mockState.user.passwordHash = null;
    return true;
  },
}));

vi.mock("@/lib/db/queries/two-factor", () => ({
  findTwoFactorLoginUserByEmail: async (email: string) =>
    mockState.user?.email === email ? mockState.user : null,
  findTwoFactorLoginUserById: async (userId: string) =>
    mockState.user?.id === userId ? mockState.user : null,
  replaceTwoFactorBackupCodes: async () => true,
}));

import { POST as deleteAccountPost } from "../../src/app/api/v1/auth/delete-account/route";
import { authorizeCredentials } from "../../src/lib/auth/credentials";

function createJsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/v1/auth/delete-account", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    method: "POST",
  }) as NextRequest;
}

async function readJson(response: Response): Promise<ApiEnvelope> {
  return response.json() as Promise<ApiEnvelope>;
}

describe("delete account flow", () => {
  beforeEach(async () => {
    mockState.session = { user: { id: USER_ID } };
    mockState.user = {
      avatarUrl: null,
      deletedAt: null,
      email: "user@example.com",
      emailVerified: new Date("2026-05-07T00:00:00.000Z"),
      id: USER_ID,
      name: "User",
      passwordHash: await hashPassword("Password1"),
      twoFactorBackupCodeHashes: [],
      twoFactorEnabled: false,
      twoFactorSecret: null,
    };
  });

  it("should soft-delete an account and reject future credential login", async () => {
    const response = await deleteAccountPost(
      createJsonRequest({ password: "Password1" }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.user?.deletedAt).toBeInstanceOf(Date);
    expect(mockState.user?.email).not.toBe("user@example.com");

    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "Password1" },
        new Request("http://localhost/login"),
      ),
    ).resolves.toBeNull();
  });

  it("should reject account deletion with an invalid password", async () => {
    const response = await deleteAccountPost(
      createJsonRequest({ password: "Wrongpass1" }),
    );
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("INVALID_PASSWORD");
    expect(mockState.user?.deletedAt).toBeNull();
  });
});
