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
  paymentMethod: string;
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
  ewallet?: string;
  grossAmountIdr: number;
  metadata?: Record<string, unknown>;
  orderId: string;
  paymentMethod?: string;
  plan: PaymentPlan;
  store?: string;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        details?: unknown;
        message: string;
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
  const bankMethods = new Set([
    "bca",
    "bni",
    "bri",
    "cimb",
    "danamon",
    "mandiri",
    "permata",
  ]);
  const ewalletMethods = new Set([
    "dana",
    "gopay",
    "linkaja",
    "ovo",
    "shopeepay",
  ]);
  const cstoreMethods = new Set(["alfamart", "indomaret"]);

  class PayGateConfigurationError extends Error {}
  class PayGateUnsupportedChannelError extends Error {
    readonly paymentMethod: string;

    constructor(paymentMethod: string) {
      super(`Unsupported PayGate payment channel: ${paymentMethod}.`);
      this.paymentMethod = paymentMethod;
    }
  }
  class PayGateApiError extends Error {
    readonly details: unknown;
    readonly status: number;

    constructor(status: number, message: string, details?: unknown) {
      super(message);
      this.details = details;
      this.status = status;
    }
  }

  function getMockPaymentMethod(input: PayGateInput): string {
    return input.paymentMethod ?? input.bank ?? input.ewallet ?? input.store ?? "bca";
  }

  function getMockPaymentType(method: string): string {
    if (bankMethods.has(method)) return "bank_transfer";
    if (ewalletMethods.has(method)) return "ewallet";
    if (cstoreMethods.has(method)) return "cstore";
    if (method === "qris") return "qris";

    throw new PayGateUnsupportedChannelError(method);
  }

  function buildMockPaymentDetails(method: string) {
    if (bankMethods.has(method)) {
      return {
        midtrans: {
          va_numbers: [{ bank: method, va_number: "88001234567890" }],
        },
      };
    }

    if (ewalletMethods.has(method)) {
      return {
        actions: [
          {
            name: "Open wallet",
            type: "deeplink",
            url: `https://wallet.example/${method}`,
          },
        ],
        midtrans: {
          actions: [
            {
              name: "Open wallet",
              type: "deeplink",
              url: `https://wallet.example/${method}`,
            },
          ],
        },
      };
    }

    if (method === "qris") {
      return {
        midtrans: {
          qr_string: "000201010212",
          qr_url: "https://pay.example/qris.png",
        },
        qr_string: "000201010212",
        qr_url: "https://pay.example/qris.png",
      };
    }

    return {
      midtrans: {
        cstore: method,
        payment_code: "1234567890",
      },
      payment_code: "1234567890",
    };
  }

  return {
    PayGateApiError,
    PayGateConfigurationError,
    PayGateUnsupportedChannelError,
    assertPayGateConfigured: () => {
      if (!mockState.payGateConfigured) {
        throw new PayGateConfigurationError("missing store token");
      }
    },
    createPayGateCharge: async (input: PayGateInput) => {
      mockState.payGateInputs.push(input);
      if (mockState.payGateError) throw mockState.payGateError;
      const paymentMethod = getMockPaymentMethod(input);
      const paymentType = getMockPaymentType(paymentMethod);
      const paymentDetails = buildMockPaymentDetails(paymentMethod);

      return {
        ...mockState.payGateResponse,
        data: {
          ...mockState.payGateResponse.data,
          ...paymentDetails,
          order_id: input.orderId,
          payment_method: paymentMethod,
          payment_type: paymentType,
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
      channel: {
        id: string;
        instructions: string;
        name: string;
      };
      orderId: string;
      paymentMethod: string;
      redirectUrl: string;
      status: string;
      transactionId: string;
      vaNumbers: Array<{ bank: string; va_number: string }>;
    }>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      channel: {
        id: "bca",
        name: "BCA Virtual Account",
      },
      paymentMethod: "bca",
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
        paymentMethod: "bca",
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
          paymentMethod: "bca",
          paymentType: "bank_transfer",
          plan: "PRO",
          source: "linksnap",
        },
        orderId: body.data.orderId,
        paymentMethod: "bca",
        plan: "PRO",
      },
    ]);
  });

  it.each([
    {
      channelName: "BNI Virtual Account",
      extraInput: { bank: "bni", paymentMethod: "bni" },
      method: "bni",
      paymentType: "bank_transfer",
      responseFields: {
        paymentCode: null,
        qrUrl: null,
        vaNumbers: [{ bank: "bni", va_number: "88001234567890" }],
      },
    },
    {
      channelName: "GoPay",
      extraInput: { ewallet: "gopay", paymentMethod: "gopay" },
      method: "gopay",
      paymentType: "ewallet",
      responseFields: {
        actions: [
          {
            name: "Open wallet",
            type: "deeplink",
            url: "https://wallet.example/gopay",
          },
        ],
        paymentCode: null,
        qrUrl: null,
      },
    },
    {
      channelName: "QRIS",
      extraInput: { paymentMethod: "qris" },
      method: "qris",
      paymentType: "qris",
      responseFields: {
        paymentCode: null,
        qrString: "000201010212",
        qrUrl: "https://pay.example/qris.png",
      },
    },
    {
      channelName: "Indomaret",
      extraInput: { paymentMethod: "indomaret", store: "indomaret" },
      method: "indomaret",
      paymentType: "cstore",
      responseFields: {
        paymentCode: "1234567890",
        qrUrl: null,
      },
    },
  ])(
    "should create a PayGate transaction for $method",
    async ({ channelName, extraInput, method, paymentType, responseFields }) => {
      const response = await POST(
        createRequest({
          duration: "MONTHLY",
          paymentMethod: method,
          plan: "PRO",
        }),
      );
      const body = await readJson<{
        actions?: unknown[];
        channel: {
          id: string;
          instructions: string;
          name: string;
        };
        orderId: string;
        paymentCode: string | null;
        paymentMethod: string;
        paymentType: string;
        qrString?: string | null;
        qrUrl: string | null;
        vaNumbers: Array<{ bank: string; va_number: string }>;
      }>(response);

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      if (!body.success) return;

      expect(body.data).toMatchObject({
        channel: {
          id: method,
          name: channelName,
        },
        paymentMethod: method,
        paymentType,
        ...responseFields,
      });
      expect(body.data.channel.instructions).toEqual(expect.any(String));
      expect(mockState.payGateInputs).toEqual([
        expect.objectContaining({
          ...extraInput,
          metadata: expect.objectContaining({
            paymentMethod: method,
            paymentType,
          }),
        }),
      ]);
    },
  );

  it("should reject unsupported payment methods before creating a transaction", async () => {
    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        paymentMethod: "dragonpay",
        plan: "PRO",
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
    mockState.payGateError = new PayGateApiError(400, "bad parameter", {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid charge payload.",
      },
    });

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
    expect(body.error.message).toBe(
      "Payment details were rejected. Please choose another method or try again.",
    );
    expect(mockState.pendingInputs).toHaveLength(1);
  });

  it("should return a friendly channel unavailable error", async () => {
    mockState.payGateError = new PayGateApiError(502, "midtrans error", {
      error: {
        code: "MIDTRANS_ERROR",
        message: "Payment channel is not activated.",
      },
    });

    const response = await POST(
      createRequest({
        duration: "MONTHLY",
        paymentMethod: "gopay",
        plan: "PRO",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_PROVIDER_ERROR");
    expect(body.error.message).toBe(
      "This payment method is temporarily unavailable. Please choose another method.",
    );
    expect(body.error.details).toMatchObject({
      paymentMethod: "gopay",
      providerCode: "MIDTRANS_ERROR",
      providerStatus: 502,
    });
  });
});
