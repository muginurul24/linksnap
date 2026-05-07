import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateMidtransSignature } from "../../src/lib/payments/webhook";
import type { MidtransWebhookNotification } from "../../src/lib/validations/payment";

type UserPlan = "FREE" | "PRO" | "BUSINESS";
type PaidPlan = "PRO" | "BUSINESS";
type PaymentStatus = "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";

type MockTransaction = {
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  snapToken: string | null;
  status: PaymentStatus;
  userEmail: string;
  userId: string;
  userName: string | null;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  invoiceEmails: [] as unknown[],
  rateLimitKeys: [] as string[],
  subscriptions: [] as Array<{ plan: PaidPlan; userId: string }>,
  transactions: [] as MockTransaction[],
  user: {
    email: "buyer@example.com",
    id: "user-1",
    name: "Rafi Link",
    plan: "FREE" as UserPlan,
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: mockState.user.id } }),
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async ({ key }: { key: string }) => {
    mockState.rateLimitKeys.push(key);
    return { limited: false as const, remaining: 99 };
  },
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
    assertMidtransConfigured: () => undefined,
    createMidtransSnapTransaction: async () => ({
      redirectUrl: "https://app.sandbox.midtrans.com/snap/v2/vtweb/token-1",
      token: "token-1",
    }),
    getMidtransServerKey: () => "server-key",
  };
});

vi.mock("@/lib/db/queries/payments", () => ({
  attachTransactionSnapToken: async ({
    orderId,
    snapToken,
  }: {
    orderId: string;
    snapToken: string;
  }) => {
    const transaction = mockState.transactions.find(
      (item) => item.orderId === orderId,
    );
    if (!transaction) return null;

    transaction.snapToken = snapToken;
    return transaction;
  },
  createPendingTransactionRecord: async ({
    duration,
    grossAmountIdr,
    grossAmountUsd,
    orderId,
    plan,
    userId,
  }: {
    duration: string;
    grossAmountIdr: number;
    grossAmountUsd: number;
    orderId: string;
    plan: PaidPlan;
    userId: string;
  }) => {
    const transaction = {
      duration,
      grossAmountIdr,
      grossAmountUsd,
      orderId,
      paidAt: null,
      paymentMethod: null,
      plan,
      snapToken: null,
      status: "PENDING" as const,
      userEmail: mockState.user.email,
      userId,
      userName: mockState.user.name,
    };
    mockState.transactions.push(transaction);

    return transaction;
  },
  findBillingUserById: async () => mockState.user,
  findPaymentTransactionByOrderId: async (orderId: string) =>
    mockState.transactions.find((transaction) => transaction.orderId === orderId) ??
    null,
  updatePaymentTransactionStatus: async ({
    expectedStatus,
    orderId,
    paidAt,
    paymentMethod,
    status,
  }: {
    expectedStatus: PaymentStatus;
    orderId: string;
    paidAt?: Date | null;
    paymentMethod?: string | null;
    status: PaymentStatus;
  }) => {
    const transaction = mockState.transactions.find(
      (item) => item.orderId === orderId && item.status === expectedStatus,
    );
    if (!transaction) return null;

    transaction.paidAt = paidAt ?? transaction.paidAt;
    transaction.paymentMethod = paymentMethod ?? transaction.paymentMethod;
    transaction.status = status;

    return transaction;
  },
  updateUserPlanForPayment: async ({
    plan,
  }: {
    plan: PaidPlan;
    userId: string;
  }) => {
    mockState.user.plan = plan;
    return { id: mockState.user.id };
  },
  upsertActiveSubscriptionForUser: async ({
    plan,
    userId,
  }: {
    plan: PaidPlan;
    userId: string;
  }) => {
    mockState.subscriptions.push({ plan, userId });
    return { id: "subscription-1" };
  },
}));

vi.mock("@/lib/email/payment-emails", () => ({
  sendPaymentInvoiceEmail: async (input: unknown) => {
    mockState.invoiceEmails.push(input);
  },
}));

import { POST as createPayment } from "../../src/app/api/v1/payments/create/route";
import { POST as processWebhook } from "../../src/app/api/v1/payments/webhook/route";

function createPaymentRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/payments/create", {
    body: JSON.stringify({
      duration: "MONTHLY",
      plan: "PRO",
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function createWebhookRequest(
  notification: MidtransWebhookNotification,
): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/payments/webhook", {
    body: JSON.stringify(notification),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

function createSettlementNotification(orderId: string): MidtransWebhookNotification {
  const notification = {
    gross_amount: "128000.00",
    order_id: orderId,
    payment_type: "bank_transfer",
    settlement_time: "2026-05-07 08:00:00",
    signature_key: "",
    status_code: "200",
    transaction_status: "settlement",
  } satisfies MidtransWebhookNotification;

  return {
    ...notification,
    signature_key: calculateMidtransSignature({
      grossAmount: notification.gross_amount,
      orderId: notification.order_id,
      serverKey: "server-key",
      statusCode: notification.status_code,
    }),
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("payment create to webhook flow", () => {
  beforeEach(() => {
    process.env.USD_IDR_RATE = "16000";
    mockState.invoiceEmails = [];
    mockState.rateLimitKeys = [];
    mockState.subscriptions = [];
    mockState.transactions = [];
    mockState.user = {
      email: "buyer@example.com",
      id: "user-1",
      name: "Rafi Link",
      plan: "FREE",
    };
  });

  it("should create transaction then activate subscription from webhook", async () => {
    const createResponse = await createPayment(createPaymentRequest());
    const createBody = await readJson<{ orderId: string; snapToken: string }>(
      createResponse,
    );

    expect(createResponse.status).toBe(201);
    expect(createBody.success).toBe(true);
    if (!createBody.success) return;

    const webhookResponse = await processWebhook(
      createWebhookRequest(createSettlementNotification(createBody.data.orderId)),
    );
    const webhookBody = await readJson<{
      activatedSubscription: boolean;
      status: PaymentStatus;
    }>(webhookResponse);

    expect(webhookResponse.status).toBe(200);
    expect(webhookBody.success).toBe(true);
    if (!webhookBody.success) return;
    expect(webhookBody.data).toMatchObject({
      activatedSubscription: true,
      status: "SETTLEMENT",
    });
    expect(mockState.transactions).toMatchObject([
      {
        grossAmountIdr: 128000,
        grossAmountUsd: 8,
        orderId: createBody.data.orderId,
        paymentMethod: "bank_transfer",
        plan: "PRO",
        snapToken: "token-1",
        status: "SETTLEMENT",
      },
    ]);
    expect(mockState.subscriptions).toEqual([{ plan: "PRO", userId: "user-1" }]);
    expect(mockState.user.plan).toBe("PRO");
    expect(mockState.invoiceEmails).toHaveLength(1);
  });
});
