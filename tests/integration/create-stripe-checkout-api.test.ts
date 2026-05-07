import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";
type PaymentPlan = "PRO" | "BUSINESS";
type PaymentDuration = "MONTHLY" | "YEARLY";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockBillingUser = {
  email: string;
  name: string | null;
  plan: UserPlan;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type PendingTransactionInput = {
  duration: PaymentDuration;
  gateway?: "midtrans" | "stripe";
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: PaymentPlan;
  userId: string;
};

type StripeCheckoutInput = {
  amountUsd: number;
  baseUrl: string;
  customer: {
    email: string | null;
    name: string | null;
  };
  duration: PaymentDuration;
  orderId: string;
  plan: PaymentPlan;
  userId: string;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const previousAppUrl = process.env.APP_URL;
const previousPublicAppUrl = process.env.NEXT_PUBLIC_APP_URL;

const mockState = vi.hoisted(() => ({
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "PRO" as UserPlan,
  } as MockBillingUser | null,
  pendingInputs: [] as PendingTransactionInput[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  stripeConfigured: true,
  stripeError: null as Error | null,
  stripeInputs: [] as StripeCheckoutInput[],
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
  createPendingTransactionRecord: async (input: PendingTransactionInput) => {
    mockState.pendingInputs.push(input);
    return {
      gateway: input.gateway ?? "midtrans",
      grossAmountIdr: input.grossAmountIdr,
      grossAmountUsd: input.grossAmountUsd,
      orderId: input.orderId,
      plan: input.plan,
      snapToken: null,
    };
  },
  findBillingUserById: async () => mockState.billingUser,
}));

vi.mock("@/lib/payments/stripe", () => {
  class StripeConfigurationError extends Error {}

  return {
    StripeConfigurationError,
    assertStripeConfigured: () => {
      if (!mockState.stripeConfigured) {
        throw new StripeConfigurationError("missing stripe config");
      }
    },
  };
});

vi.mock("@/lib/payments/stripe-checkout", () => {
  class StripeCheckoutError extends Error {}

  return {
    StripeCheckoutError,
    createStripeCheckoutSession: async (input: StripeCheckoutInput) => {
      mockState.stripeInputs.push(input);
      if (mockState.stripeError) throw mockState.stripeError;

      return {
        id: "cs_test_123",
        url: "https://checkout.stripe.com/c/pay/cs_test_123",
      };
    },
  };
});

import { StripeCheckoutError } from "../../src/lib/payments/stripe-checkout";
import { POST } from "../../src/app/api/v1/payments/stripe/create/route";

function restoreEnv(key: "APP_URL" | "NEXT_PUBLIC_APP_URL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function createRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/payments/stripe/create", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method: "POST",
  });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("create Stripe checkout API", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://www.justqiu.cloud/";
    restoreEnv("NEXT_PUBLIC_APP_URL", previousPublicAppUrl);
    process.env.USD_IDR_RATE = "16000";
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "PRO",
    };
    mockState.pendingInputs = [];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.stripeConfigured = true;
    mockState.stripeError = null;
    mockState.stripeInputs = [];
  });

  afterEach(() => {
    restoreEnv("APP_URL", previousAppUrl);
    restoreEnv("NEXT_PUBLIC_APP_URL", previousPublicAppUrl);
  });

  it("should create a Stripe checkout session for a paid plan", async () => {
    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<{
      orderId: string;
      sessionId: string;
      url: string;
    }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_123",
    });
    expect(body.data.orderId).toMatch(/^LS-ST-\d+-[a-f0-9]{12}$/);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:payments:stripe:create:user-1", limit: 60, windowSeconds: 60 },
    ]);
    expect(mockState.pendingInputs).toEqual([
      {
        duration: "MONTHLY",
        gateway: "stripe",
        grossAmountIdr: 128000,
        grossAmountUsd: 8,
        orderId: body.data.orderId,
        plan: "PRO",
        userId: "user-1",
      },
    ]);
    expect(mockState.stripeInputs).toEqual([
      {
        amountUsd: 8,
        baseUrl: "https://www.justqiu.cloud",
        customer: {
          email: "buyer@example.com",
          name: "Rafi Link",
        },
        duration: "MONTHLY",
        orderId: body.data.orderId,
        plan: "PRO",
        userId: "user-1",
      },
    ]);
  });

  it("should reject invalid checkout input", async () => {
    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "FREE",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockState.pendingInputs).toEqual([]);
    expect(mockState.stripeInputs).toEqual([]);
  });

  it("should require authentication", async () => {
    mockState.session = null;

    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.rateLimitOptions).toEqual([]);
  });

  it("should rate limit checkout requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 30 };

    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.pendingInputs).toEqual([]);
    expect(mockState.stripeInputs).toEqual([]);
  });

  it("should return configuration errors before creating transactions", async () => {
    mockState.stripeConfigured = false;

    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_CONFIGURATION_ERROR");
    expect(mockState.pendingInputs).toEqual([]);
    expect(mockState.stripeInputs).toEqual([]);
  });

  it("should return provider errors when Stripe rejects the checkout session", async () => {
    mockState.stripeError = new StripeCheckoutError("missing url");

    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(mockState.pendingInputs).toHaveLength(1);
    expect(mockState.stripeInputs).toHaveLength(1);
  });
});
