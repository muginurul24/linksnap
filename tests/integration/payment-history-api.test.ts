import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

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

type MockBillingUser = {
  email: string;
  name: string | null;
  plan: UserPlan;
};

type MockBillingTransaction = {
  createdAt: Date;
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  id: string;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
  updatedAt: Date;
};

type ApiEnvelope<T> =
  | { data: T; meta?: Record<string, unknown>; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "PRO" as UserPlan,
  } as MockBillingUser | null,
  historyInputs: [] as Array<{ limit: number; page: number; userId: string }>,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  transactions: [] as MockBillingTransaction[],
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () => mockState.billingUser,
  listPaymentTransactionsByUserId: async (input: {
    limit: number;
    page: number;
    userId: string;
  }) => {
    mockState.historyInputs.push(input);
    return {
      items: mockState.transactions.slice(0, input.limit),
      total: mockState.transactions.length,
    };
  },
}));

import { GET } from "../../src/app/api/v1/payments/history/route";

function createRequest(query = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/payments/history${query}`,
    {
      method: "GET",
    },
  );
}

function createTransaction(
  overrides: Partial<MockBillingTransaction> = {},
): MockBillingTransaction {
  return {
    createdAt: new Date("2026-05-07T01:00:00.000Z"),
    duration: "MONTHLY",
    grossAmountIdr: 128000,
    grossAmountUsd: 8,
    id: "transaction-1",
    orderId: "LS-123",
    paidAt: new Date("2026-05-07T01:10:00.000Z"),
    paymentMethod: "bank_transfer",
    plan: "PRO",
    status: "SETTLEMENT",
    updatedAt: new Date("2026-05-07T01:10:00.000Z"),
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("payment history API", () => {
  beforeEach(() => {
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "PRO",
    };
    mockState.historyInputs = [];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.transactions = [createTransaction()];
  });

  it("should return paginated payment history for authenticated user", async () => {
    const response = await GET(createRequest("?limit=10&page=2"));
    const body = await readJson<MockBillingTransaction[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({
      limit: 10,
      page: 2,
      total: 1,
    });
    expect(mockState.historyInputs).toEqual([
      {
        limit: 10,
        page: 2,
        userId: "user-1",
      },
    ]);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:payments:history:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should require authentication", async () => {
    mockState.session = null;

    const response = await GET(createRequest());
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.historyInputs).toEqual([]);
  });

  it("should reject invalid pagination", async () => {
    const response = await GET(createRequest("?limit=101"));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockState.historyInputs).toEqual([]);
  });

  it("should rate limit history requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 30 };

    const response = await GET(createRequest());
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.historyInputs).toEqual([]);
  });
});
