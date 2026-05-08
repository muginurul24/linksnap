import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockMobileUser = {
  avatarUrl: string | null;
  deletedAt: Date | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  plan: "FREE" | "PRO" | "BUSINESS";
  refreshTokenHash: string | null;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type MobileSessionBody = {
  refreshToken: string;
  token: string;
  user: {
    email: string;
    id: string;
    plan: string;
  };
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

const mockState = vi.hoisted(() => ({
  rateLimitOptions: [] as RateLimitOptions[],
  user: null as MockMobileUser | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => null,
}));

vi.mock("@/lib/db/queries/mobile-auth", () => ({
  clearMobileRefreshTokenHash: async ({ userId }: { userId: string }) => {
    if (mockState.user?.id !== userId) return false;
    mockState.user.refreshTokenHash = null;
    return true;
  },
  findMobileLoginUserByEmail: async (email: string) => {
    return mockState.user?.email === email ? mockState.user : null;
  },
  findMobileRefreshUserByHash: async (refreshTokenHash: string) => {
    return mockState.user?.refreshTokenHash === refreshTokenHash ? mockState.user : null;
  },
  findMobileSessionUserById: async (userId: string) => {
    return mockState.user?.id === userId ? mockState.user : null;
  },
  saveMobileRefreshTokenHash: async ({
    refreshTokenHash,
    userId,
  }: {
    refreshTokenHash: string;
    userId: string;
  }) => {
    if (mockState.user?.id !== userId) return false;
    mockState.user.refreshTokenHash = refreshTokenHash;
    return true;
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return { limited: false as const, remaining: 99 };
  },
}));

import { POST as loginPost } from "../../src/app/api/v1/auth/login/route";
import { POST as logoutPost } from "../../src/app/api/v1/auth/logout/route";
import { GET as meGet } from "../../src/app/api/v1/auth/me/route";
import { POST as refreshPost } from "../../src/app/api/v1/auth/refresh/route";
import { hashPassword } from "../../src/lib/auth/password";
import {
  hashMobileRefreshToken,
  verifyMobileAccessToken,
} from "../../src/lib/auth/mobile-token";

function createJsonRequest(path: string, body: unknown, token?: string): NextRequest {
  return new Request(`http://localhost${path}`, {
    body: JSON.stringify(body),
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
    },
    method: "POST",
  }) as NextRequest;
}

function createGetRequest(path: string, token: string): NextRequest {
  return new Request(`http://localhost${path}`, {
    headers: { authorization: `Bearer ${token}` },
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

async function seedUser(overrides: Partial<MockMobileUser> = {}): Promise<void> {
  mockState.user = {
    avatarUrl: null,
    deletedAt: null,
    email: "user@example.com",
    emailVerified: new Date("2026-05-08T00:00:00.000Z"),
    id: "user-1",
    name: "Mobile User",
    passwordHash: await hashPassword("Password1"),
    plan: "PRO",
    refreshTokenHash: null,
    role: "user",
    twoFactorEnabled: false,
    twoFactorSecret: null,
    ...overrides,
  };
}

async function login(): Promise<MobileSessionBody> {
  const response = await loginPost(
    createJsonRequest("/api/v1/auth/login", {
      email: "USER@example.com",
      password: "Password1",
    }),
  );
  const body = await readJson<MobileSessionBody>(response);
  if (!body.success) throw new Error("Expected login to succeed");
  return body.data;
}

describe("mobile auth API", () => {
  beforeEach(async () => {
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-chars";
    mockState.rateLimitOptions.length = 0;
    await seedUser();
  });

  it("should issue mobile access and refresh tokens for verified password users", async () => {
    const session = await login();

    expect(session.user).toMatchObject({
      email: "user@example.com",
      id: "user-1",
      plan: "PRO",
    });
    expect(verifyMobileAccessToken(session.token)).toMatchObject({
      email: "user@example.com",
      sub: "user-1",
    });
    expect(mockState.user?.refreshTokenHash).toBe(
      hashMobileRefreshToken(session.refreshToken),
    );
    expect(mockState.rateLimitOptions[0]).toEqual({
      key: "auth:mobile:login:203.0.113.10",
      limit: 5,
      windowSeconds: 900,
    });
  });

  it("should reject unverified or two-factor-enabled users", async () => {
    await seedUser({ emailVerified: null });

    const unverified = await loginPost(
      createJsonRequest("/api/v1/auth/login", {
        email: "user@example.com",
        password: "Password1",
      }),
    );
    const unverifiedBody = await readJson<MobileSessionBody>(unverified);

    expect(unverified.status).toBe(403);
    expect(unverifiedBody.success).toBe(false);
    if (!unverifiedBody.success) {
      expect(unverifiedBody.error.code).toBe("EMAIL_NOT_VERIFIED");
    }

    await seedUser({ twoFactorEnabled: true, twoFactorSecret: "secret" });

    const twoFactor = await loginPost(
      createJsonRequest("/api/v1/auth/login", {
        email: "user@example.com",
        password: "Password1",
      }),
    );
    const twoFactorBody = await readJson<MobileSessionBody>(twoFactor);

    expect(twoFactor.status).toBe(403);
    expect(twoFactorBody.success).toBe(false);
    if (!twoFactorBody.success) {
      expect(twoFactorBody.error.code).toBe("TWO_FACTOR_REQUIRED");
    }
  });

  it("should rotate refresh tokens and return the current mobile user", async () => {
    const session = await login();
    const oldRefreshHash = mockState.user?.refreshTokenHash;

    const refreshed = await refreshPost(
      createJsonRequest("/api/v1/auth/refresh", {
        refreshToken: session.refreshToken,
      }),
    );
    const refreshedBody = await readJson<MobileSessionBody>(refreshed);

    expect(refreshed.status).toBe(200);
    expect(refreshedBody.success).toBe(true);
    if (!refreshedBody.success) return;
    expect(refreshedBody.data.refreshToken).not.toBe(session.refreshToken);
    expect(mockState.user?.refreshTokenHash).not.toBe(oldRefreshHash);

    const me = await meGet(createGetRequest("/api/v1/auth/me", refreshedBody.data.token));
    const meBody = await readJson<{ user: MobileSessionBody["user"] }>(me);

    expect(me.status).toBe(200);
    expect(meBody.success).toBe(true);
    if (meBody.success) {
      expect(meBody.data.user.email).toBe("user@example.com");
    }
  });

  it("should clear refresh token hash on logout", async () => {
    const session = await login();

    const response = await logoutPost(
      createJsonRequest(
        "/api/v1/auth/logout",
        { refreshToken: session.refreshToken },
        session.token,
      ),
    );

    expect(response.status).toBe(200);
    expect(mockState.user?.refreshTokenHash).toBeNull();
  });
});
