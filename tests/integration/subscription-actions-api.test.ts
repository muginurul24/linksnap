import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockAuthUser = {
  role: "USER" | "SUPERADMIN";
  userId: string;
  userPlan: "FREE" | "PRO" | "BUSINESS";
} | null;

type MockSubscription = {
  canceledAt: Date | null;
  currentPeriodEnd: Date;
  plan: "PRO" | "BUSINESS";
  status: "ACTIVE" | "CANCELED";
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

const mockState = vi.hoisted(() => ({
  authUser: {
    role: "USER",
    userId: "user-1",
    userPlan: "PRO",
  } as MockAuthUser,
  cancelCalls: [] as Array<{ canceledAt: Date; userId: string }>,
  cacheDeletes: [] as string[],
  rateLimitCalls: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 },
  reactivateCalls: [] as Array<{ userId: string }>,
  subscription: {
    canceledAt: null,
    currentPeriodEnd: new Date("2026-06-09T00:00:00Z"),
    plan: "PRO",
    status: "CANCELED",
  } as MockSubscription | null,
}));

vi.mock("@/lib/auth/request-user", () => ({
  getAuthenticatedRequestUser: async () => mockState.authUser,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitCalls.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/payments/dashboard-subscription-cache", () => ({
  deleteDashboardSubscriptionSnapshot: async (userId: string) => {
    mockState.cacheDeletes.push(userId);
  },
}));

vi.mock("@/lib/db/queries/payments", () => ({
  cancelActiveSubscriptionForUser: async (input: {
    canceledAt: Date;
    userId: string;
  }) => {
    mockState.cancelCalls.push(input);
    return mockState.subscription;
  },
  reactivateCanceledSubscriptionForUser: async (input: { userId: string }) => {
    mockState.reactivateCalls.push(input);
    return mockState.subscription;
  },
}));

import { POST as cancelSubscription } from "../../src/app/api/v1/payments/subscriptions/cancel/route";
import { POST as reactivateSubscription } from "../../src/app/api/v1/payments/subscriptions/reactivate/route";

function createRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { method: "POST" });
}

async function readJson(response: Response) {
  return response.json() as Promise<{
    data?: {
      status?: string;
    };
    error?: {
      code: string;
    };
    success: boolean;
  }>;
}

describe("subscription action APIs", () => {
  beforeEach(() => {
    mockState.authUser = {
      role: "USER",
      userId: "user-1",
      userPlan: "PRO",
    };
    mockState.cancelCalls = [];
    mockState.cacheDeletes = [];
    mockState.rateLimitCalls = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.reactivateCalls = [];
    mockState.subscription = {
      canceledAt: null,
      currentPeriodEnd: new Date("2026-06-09T00:00:00Z"),
      plan: "PRO",
      status: "CANCELED",
    };
  });

  it("should cancel an active subscription renewal", async () => {
    mockState.subscription = {
      canceledAt: new Date("2026-05-09T00:00:00Z"),
      currentPeriodEnd: new Date("2026-06-09T00:00:00Z"),
      plan: "PRO",
      status: "CANCELED",
    };

    const response = await cancelSubscription(
      createRequest("/api/v1/payments/subscriptions/cancel"),
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe("CANCELED");
    expect(mockState.cancelCalls).toHaveLength(1);
    expect(mockState.cacheDeletes).toEqual(["user-1"]);
  });

  it("should reactivate a canceled subscription", async () => {
    mockState.subscription = {
      canceledAt: null,
      currentPeriodEnd: new Date("2026-06-09T00:00:00Z"),
      plan: "PRO",
      status: "ACTIVE",
    };

    const response = await reactivateSubscription(
      createRequest("/api/v1/payments/subscriptions/reactivate"),
    );
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data?.status).toBe("ACTIVE");
    expect(mockState.reactivateCalls).toEqual([{ userId: "user-1" }]);
    expect(mockState.cacheDeletes).toEqual(["user-1"]);
  });

  it("should reject unauthenticated subscription actions", async () => {
    mockState.authUser = null;

    const response = await cancelSubscription(
      createRequest("/api/v1/payments/subscriptions/cancel"),
    );
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should return conflict when no subscription can be updated", async () => {
    mockState.subscription = null;

    const response = await reactivateSubscription(
      createRequest("/api/v1/payments/subscriptions/reactivate"),
    );
    const body = await readJson(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("SUBSCRIPTION_NOT_CANCELED");
  });
});
