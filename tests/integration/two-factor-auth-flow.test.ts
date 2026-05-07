import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../../src/lib/auth/password";
import {
  generateTotpToken,
  verifyTotpToken,
} from "../../src/lib/auth/two-factor";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockUser = {
  avatarUrl: string | null;
  email: string;
  emailVerified: Date | null;
  id: string;
  name: string | null;
  passwordHash: string | null;
  twoFactorBackupCodeHashes: string[];
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

type ChallengeData = {
  challengeId: string;
  twoFactorRequired: boolean;
};

type SetupData = {
  otpauthUrl: string;
  qrCodeDataUrl: string;
  secret: string;
};

type BackupCodesData = {
  backupCodes: string[];
};

const USER_ID = "00000000-0000-4000-8000-000000000001";

const mockState = vi.hoisted(() => ({
  cache: new Map<string, string>(),
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

vi.mock("@/lib/db/queries/two-factor", () => ({
  disableTwoFactor: async (userId: string) => {
    if (!mockState.user || userId !== USER_ID) return false;
    mockState.user.twoFactorBackupCodeHashes = [];
    mockState.user.twoFactorEnabled = false;
    mockState.user.twoFactorSecret = null;
    return true;
  },
  enableTwoFactor: async ({
    backupCodeHashes,
    userId,
  }: {
    backupCodeHashes: string[];
    userId: string;
  }) => {
    if (!mockState.user || userId !== USER_ID) return false;
    mockState.user.twoFactorBackupCodeHashes = backupCodeHashes;
    mockState.user.twoFactorEnabled = true;
    return true;
  },
  findTwoFactorLoginUserByEmail: async (email: string) =>
    mockState.user?.email === email ? mockState.user : null,
  findTwoFactorLoginUserById: async (userId: string) =>
    mockState.user?.id === userId ? mockState.user : null,
  replaceTwoFactorBackupCodes: async ({
    backupCodeHashes,
    userId,
  }: {
    backupCodeHashes: string[];
    userId: string;
  }) => {
    if (!mockState.user || userId !== USER_ID) return false;
    mockState.user.twoFactorBackupCodeHashes = backupCodeHashes;
    return true;
  },
  saveTwoFactorSetupSecret: async ({
    secret,
    userId,
  }: {
    secret: string;
    userId: string;
  }) => {
    if (!mockState.user || userId !== USER_ID) return false;
    mockState.user.twoFactorBackupCodeHashes = [];
    mockState.user.twoFactorEnabled = false;
    mockState.user.twoFactorSecret = secret;
    return true;
  },
}));

import { POST as challengePost } from "../../src/app/api/v1/auth/2fa/challenge/route";
import { POST as setupPost } from "../../src/app/api/v1/auth/2fa/setup/route";
import { POST as verifyPost } from "../../src/app/api/v1/auth/2fa/verify/route";
import { authorizeCredentials } from "../../src/lib/auth/credentials";

function createJsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost:3000${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.20",
      "x-requested-with": "XMLHttpRequest",
    },
    method: "POST",
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("two-factor auth flow", () => {
  beforeEach(async () => {
    mockState.cache.clear();
    mockState.session = { user: { id: USER_ID } };
    mockState.user = {
      avatarUrl: null,
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

  it("should enable TOTP 2FA and require it during login", async () => {
    const setupResponse = await setupPost();
    const setupBody = await readJson<SetupData>(setupResponse);

    expect(setupResponse.status).toBe(200);
    expect(setupBody.success).toBe(true);
    if (!setupBody.success) return;
    expect(setupBody.data.otpauthUrl).toContain("otpauth://totp/");
    expect(setupBody.data.qrCodeDataUrl).toContain("data:image/png;base64,");
    expect(mockState.user?.twoFactorSecret).toBe(setupBody.data.secret);

    const token = generateTotpToken({ secret: setupBody.data.secret });
    expect(verifyTotpToken({ secret: setupBody.data.secret, token })).toBe(true);

    const verifyResponse = await verifyPost(
      createJsonRequest("/api/v1/auth/2fa/verify", { token }),
    );
    const verifyBody = await readJson<BackupCodesData>(verifyResponse);

    expect(verifyResponse.status).toBe(200);
    expect(verifyBody.success).toBe(true);
    if (!verifyBody.success) return;
    expect(verifyBody.data.backupCodes).toHaveLength(8);
    expect(mockState.user?.twoFactorEnabled).toBe(true);
    expect(mockState.user?.twoFactorBackupCodeHashes).toHaveLength(8);

    const challengeResponse = await challengePost(
      createJsonRequest("/api/v1/auth/2fa/challenge", {
        email: "user@example.com",
        password: "Password1",
      }),
    );
    const challengeBody = await readJson<ChallengeData>(challengeResponse);

    expect(challengeResponse.status).toBe(200);
    expect(challengeBody.success).toBe(true);
    if (!challengeBody.success) return;
    expect(challengeBody.data.twoFactorRequired).toBe(true);

    const authorizedUser = await authorizeCredentials(
      {
        challengeId: challengeBody.data.challengeId,
        totpToken: generateTotpToken({ secret: setupBody.data.secret }),
      },
      new Request("http://localhost/login"),
    );

    expect(authorizedUser).toEqual({
      email: "user@example.com",
      id: USER_ID,
      image: undefined,
      name: "User",
    });
  });

  it("should allow a backup code once during 2FA login", async () => {
    const setupResponse = await setupPost();
    const setupBody = await readJson<SetupData>(setupResponse);
    if (!setupBody.success) throw new Error("setup failed");

    const verifyResponse = await verifyPost(
      createJsonRequest("/api/v1/auth/2fa/verify", {
        token: generateTotpToken({ secret: setupBody.data.secret }),
      }),
    );
    const verifyBody = await readJson<BackupCodesData>(verifyResponse);
    if (!verifyBody.success) throw new Error("verify failed");

    const challengeResponse = await challengePost(
      createJsonRequest("/api/v1/auth/2fa/challenge", {
        email: "user@example.com",
        password: "Password1",
      }),
    );
    const challengeBody = await readJson<ChallengeData>(challengeResponse);
    if (!challengeBody.success) throw new Error("challenge failed");

    const firstBackupCode = verifyBody.data.backupCodes[0];
    const authorizedUser = await authorizeCredentials(
      {
        backupCode: firstBackupCode,
        challengeId: challengeBody.data.challengeId,
      },
      new Request("http://localhost/login"),
    );

    expect(authorizedUser?.id).toBe(USER_ID);
    expect(mockState.user?.twoFactorBackupCodeHashes).toHaveLength(7);

    const secondChallengeResponse = await challengePost(
      createJsonRequest("/api/v1/auth/2fa/challenge", {
        email: "user@example.com",
        password: "Password1",
      }),
    );
    const secondChallengeBody = await readJson<ChallengeData>(
      secondChallengeResponse,
    );
    if (!secondChallengeBody.success) throw new Error("second challenge failed");

    await expect(
      authorizeCredentials(
        {
          backupCode: firstBackupCode,
          challengeId: secondChallengeBody.data.challengeId,
        },
        new Request("http://localhost/login"),
      ),
    ).resolves.toBeNull();
  });
});
