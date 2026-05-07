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

type MidtransInput = {
  callbackUrls: {
    error: string;
    finish: string;
    unfinish: string;
  };
  customer: {
    email: string | null;
    name: string | null;
  };
  duration: PaymentDuration;
  grossAmountIdr: number;
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
  attachedTokens: [] as Array<{ orderId: string; snapToken: string }>,
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "PRO" as UserPlan,
  } as MockBillingUser | null,
  midtransConfigured: true,
  midtransError: null as Error | null,
  midtransInputs: [] as MidtransInput[],
  midtransResponse: {
    redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
    token: "token-1",
  },
  pendingInputs: [] as PendingTransactionInput[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
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
  attachTransactionSnapToken: async (input: {
    orderId: string;
    snapToken: string;
  }) => {
    mockState.attachedTokens.push(input);
    const pending = mockState.pendingInputs.find(
      (transaction) => transaction.orderId === input.orderId,
    );

    if (!pending) return null;

    return {
      grossAmountIdr: pending.grossAmountIdr,
      grossAmountUsd: pending.grossAmountUsd,
      orderId: pending.orderId,
      plan: pending.plan,
      snapToken: input.snapToken,
    };
  },
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

vi.mock("@/lib/payments/midtrans", () => {
  class MidtransConfigurationError extends Error {}
  class MidtransApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }

  return {
    MidtransApiError,
    MidtransConfigurationError,
    assertMidtransConfigured: () => {
      if (!mockState.midtransConfigured) {
        throw new MidtransConfigurationError("missing server key");
      }
    },
    createMidtransSnapTransaction: async (input: MidtransInput) => {
      mockState.midtransInputs.push(input);
      if (mockState.midtransError) throw mockState.midtransError;

      return mockState.midtransResponse;
    },
  };
});

import { MidtransApiError } from "../../src/lib/payments/midtrans";
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
    mockState.attachedTokens = [];
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "PRO",
    };
    mockState.midtransConfigured = true;
    mockState.midtransError = null;
    mockState.midtransInputs = [];
    mockState.midtransResponse = {
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
      token: "token-1",
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

  it("should create a Midtrans Snap transaction for a paid plan", async () => {
    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        plan: "PRO",
      }),
    );
    const body = await readJson<{
      orderId: string;
      redirectUrl: string;
      snapToken: string;
    }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
      snapToken: "token-1",
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
    expect(mockState.midtransInputs).toEqual([
      {
        callbackUrls: {
          error: `https://www.justqiu.cloud/checkout/cancel?order_id=${body.data.orderId}&status=error`,
          finish: `https://www.justqiu.cloud/checkout/success?order_id=${body.data.orderId}`,
          unfinish: `https://www.justqiu.cloud/checkout/cancel?order_id=${body.data.orderId}&status=unfinish`,
        },
        customer: {
          email: "buyer@example.com",
          name: "Rafi Link",
        },
        duration: "MONTHLY",
        grossAmountIdr: 128000,
        orderId: body.data.orderId,
        plan: "PRO",
      },
    ]);
    expect(mockState.attachedTokens).toEqual([
      {
        orderId: body.data.orderId,
        snapToken: "token-1",
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
    expect(mockState.midtransInputs).toEqual([]);
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
    expect(mockState.midtransInputs).toEqual([]);
  });

  it("should return payment configuration errors without creating transactions", async () => {
    mockState.midtransConfigured = false;

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
    expect(mockState.midtransInputs).toEqual([]);
  });

  it("should return provider errors when Midtrans rejects the transaction", async () => {
    mockState.midtransError = new MidtransApiError(400, "bad parameter");

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
    expect(mockState.attachedTokens).toEqual([]);
  });
});
