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
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  plan: PaymentPlan;
  userId: string;
};

type PayGateInput = {
  bank?: string;
  callbackUrl: string;
  customer: {
    email: string | null;
    name: string | null;
  };
  duration: PaymentDuration;
  grossAmountIdr: number;
  metadata?: Record<string, unknown>;
  orderId: string;
  plan: PaymentPlan;
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
  payGateConfigured: true,
  payGateError: null as Error | null,
  payGateInputs: [] as PayGateInput[],
  payGateResponse: {
    data: {
      amount: 128000,
      midtrans: {
        va_numbers: [{ bank: "bca", va_number: "88001234567890" }],
      },
      order_id: "LS-1746691200000-abc123def456",
      payment_type: "bank_transfer",
      platform_order_id: "linksnap_LS-1746691200000-abc123def456",
      status: "pending",
      transaction_id: "paygate-transaction-1",
    },
    success: true,
  },
  pendingInputs: [] as PendingTransactionInput[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.billingUser?.plan ?? null,
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
      grossAmountIdr: input.grossAmountIdr,
      grossAmountUsd: input.grossAmountUsd,
      orderId: input.orderId,
      plan: input.plan,
      snapToken: null,
    };
  },
  findBillingUserById: async () => mockState.billingUser,
}));

vi.mock("@/lib/payments/paygate", () => {
  class PayGateConfigurationError extends Error {}
  class PayGateApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    PayGateApiError,
    PayGateConfigurationError,
    assertPayGateConfigured: () => {
      if (!mockState.payGateConfigured) {
        throw new PayGateConfigurationError("missing store token");
      }
    },
    createPayGateCharge: async (input: PayGateInput) => {
      mockState.payGateInputs.push(input);
      if (mockState.payGateError) throw mockState.payGateError;

      return {
        ...mockState.payGateResponse,
        data: {
          ...mockState.payGateResponse.data,
          order_id: input.orderId,
        },
      };
    },
  };
});

import { PayGateApiError } from "../../src/lib/payments/paygate";
import { POST } from "../../src/app/api/v1/payments/create/route";

function restoreEnv(key: "APP_URL" | "NEXT_PUBLIC_APP_URL", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function createRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/payments/create", {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method: "POST",
  });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("create payment API", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://www.justqiu.cloud/";
    restoreEnv("NEXT_PUBLIC_APP_URL", previousPublicAppUrl);
    process.env.USD_IDR_RATE = "16000";
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "PRO",
    };
    mockState.payGateConfigured = true;
    mockState.payGateError = null;
    mockState.payGateInputs = [];
    mockState.payGateResponse = {
      data: {
        amount: 128000,
        midtrans: {
          va_numbers: [{ bank: "bca", va_number: "88001234567890" }],
        },
        order_id: "LS-1746691200000-abc123def456",
        payment_type: "bank_transfer",
        platform_order_id: "linksnap_LS-1746691200000-abc123def456",
        status: "pending",
        transaction_id: "paygate-transaction-1",
      },
      success: true,
    };
    mockState.pendingInputs = [];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
  });

  afterEach(() => {
    restoreEnv("APP_URL", previousAppUrl);
    restoreEnv("NEXT_PUBLIC_APP_URL", previousPublicAppUrl);
  });

  it("should create a PayGate bank transfer transaction for a paid plan", async () => {
    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<{
      orderId: string;
      redirectUrl: string;
      status: string;
      transactionId: string;
      vaNumbers: Array<{ bank: string; va_number: string }>;
    }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      paymentType: "bank_transfer",
      redirectUrl: expect.stringContaining("/checkout/success?order_id="),
      status: "pending",
      transactionId: "paygate-transaction-1",
      vaNumbers: [{ bank: "bca", va_number: "88001234567890" }],
    });
    expect(body.data.orderId).toMatch(/^LS-\d+-[a-f0-9]{12}$/);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:payments:create:user-1", limit: 60, windowSeconds: 60 },
    ]);
    expect(mockState.pendingInputs).toEqual([
      {
        duration: "MONTHLY",
        grossAmountIdr: 128000,
        grossAmountUsd: 8,
        orderId: body.data.orderId,
        plan: "PRO",
        userId: "user-1",
      },
    ]);
    expect(mockState.payGateInputs).toEqual([
      {
        bank: "bca",
        callbackUrl: "https://www.justqiu.cloud/api/v1/payments/webhook",
        customer: {
          email: "buyer@example.com",
          name: "Rafi Link",
        },
        duration: "MONTHLY",
        grossAmountIdr: 128000,
        metadata: {
          duration: "MONTHLY",
          plan: "PRO",
          source: "linksnap",
        },
        orderId: body.data.orderId,
        plan: "PRO",
      },
    ]);
  });

  it("should reject invalid payment input", async () => {
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
    expect(mockState.payGateInputs).toEqual([]);
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

  it("should rate limit create payment requests", async () => {
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
    expect(mockState.payGateInputs).toEqual([]);
  });

  it("should return payment configuration errors without creating transactions", async () => {
    mockState.payGateConfigured = false;

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
    expect(mockState.payGateInputs).toEqual([]);
  });

  it("should return provider errors when PayGate rejects the transaction", async () => {
    mockState.payGateError = new PayGateApiError(400, "bad parameter");

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
  });
});
