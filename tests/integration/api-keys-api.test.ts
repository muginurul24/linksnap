import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserPlan } from "../../src/lib/links/limits";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockApiKeyRecord = {
  createdAt: Date;
  id: string;
  keyHash: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
  userId: string;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message: string;
      };
      success: false;
    };

type ApiKeyListItem = {
  createdAt: Date;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
};

type CreateApiKeyResponse = {
  apiKey: ApiKeyListItem;
  key: string;
  maskedKey: string;
};

const USER_ID = "00000000-0000-4000-8000-000000000001";
const KEY_ID = "00000000-0000-4000-8000-000000000101";

const mockState = vi.hoisted(() => ({
  keys: [] as MockApiKeyRecord[],
  plan: "PRO" as UserPlan | null,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "00000000-0000-4000-8000-000000000001" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () =>
    mockState.plan
      ? { email: "user@example.com", name: "User", plan: mockState.plan }
      : null,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/api-keys", () => ({
  createApiKeyRecord: async ({
    keyHash,
    keyPrefix,
    name,
    userId,
  }: {
    keyHash: string;
    keyPrefix: string;
    name: string;
    userId: string;
  }) => {
    const record = {
      createdAt: new Date("2026-05-07T08:00:00.000Z"),
      id: KEY_ID,
      keyHash,
      keyPrefix,
      lastUsedAt: null,
      name,
      userId,
    };
    mockState.keys.unshift(record);

    return {
      createdAt: record.createdAt,
      id: record.id,
      keyPrefix: record.keyPrefix,
      lastUsedAt: record.lastUsedAt,
      name: record.name,
    };
  },
  deleteApiKeyForUser: async ({ id, userId }: { id: string; userId: string }) => {
    const index = mockState.keys.findIndex(
      (apiKey) => apiKey.id === id && apiKey.userId === userId,
    );
    if (index === -1) return false;

    mockState.keys.splice(index, 1);
    return true;
  },
  listApiKeysByUserId: async (userId: string) =>
    mockState.keys
      .filter((apiKey) => apiKey.userId === userId)
      .map((apiKey) => ({
        createdAt: apiKey.createdAt,
        id: apiKey.id,
        keyPrefix: apiKey.keyPrefix,
        lastUsedAt: apiKey.lastUsedAt,
        name: apiKey.name,
      })),
}));

import { DELETE } from "../../src/app/api/v1/settings/api-keys/[id]/route";
import {
  GET,
  POST,
} from "../../src/app/api/v1/settings/api-keys/route";

function createJsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/v1/settings/api-keys", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function createDeleteContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("API keys settings API", () => {
  beforeEach(() => {
    mockState.keys.length = 0;
    mockState.plan = "PRO";
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: USER_ID } };
  });

  it("should list API keys for paid users without exposing hashes", async () => {
    mockState.keys.push({
      createdAt: new Date("2026-05-07T08:00:00.000Z"),
      id: KEY_ID,
      keyHash: "a".repeat(64),
      keyPrefix: "lsnap_sk_abcd1234",
      lastUsedAt: null,
      name: "Production",
      userId: USER_ID,
    });

    const response = await GET();
    const body = await readJson<ApiKeyListItem[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toEqual([
      {
        createdAt: "2026-05-07T08:00:00.000Z",
        id: KEY_ID,
        keyPrefix: "lsnap_sk_abcd1234",
        lastUsedAt: null,
        name: "Production",
      },
    ]);
    expect(JSON.stringify(body.data)).not.toContain("keyHash");
  });

  it("should create API keys with a returned-once secret and stored hash", async () => {
    const response = await POST(createJsonRequest({ name: "Production" }));
    const body = await readJson<CreateApiKeyResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.key).toMatch(/^lsnap_sk_[A-Za-z0-9_-]{43}$/);
    expect(body.data.maskedKey).toMatch(/^lsnap_sk_[A-Za-z0-9_-]{8}\.\.\.[A-Za-z0-9_-]{4}$/);
    expect(body.data.apiKey).toMatchObject({
      id: KEY_ID,
      keyPrefix: body.data.maskedKey.slice(0, "lsnap_sk_aaaaaaaa".length),
      name: "Production",
    });
    expect(mockState.keys[0]?.keyHash).toHaveLength(64);
    expect(mockState.keys[0]?.keyHash).not.toBe(body.data.key);
  });

  it("should reject free users", async () => {
    mockState.plan = "FREE";

    const response = await POST(createJsonRequest({ name: "Production" }));
    const body = await readJson<CreateApiKeyResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PLAN_UPGRADE_REQUIRED");
  });

  it("should reject invalid create input", async () => {
    const response = await POST(createJsonRequest({ name: "" }));
    const body = await readJson<CreateApiKeyResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should revoke an owned API key", async () => {
    mockState.keys.push({
      createdAt: new Date("2026-05-07T08:00:00.000Z"),
      id: KEY_ID,
      keyHash: "a".repeat(64),
      keyPrefix: "lsnap_sk_abcd1234",
      lastUsedAt: null,
      name: "Production",
      userId: USER_ID,
    });

    const response = await DELETE({} as NextRequest, createDeleteContext(KEY_ID));
    const body = await readJson<{ deleted: true; id: string }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.keys).toEqual([]);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET();
    const body = await readJson<ApiKeyListItem[]>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
