import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PayGateWebhookPayload } from "../../src/lib/validations/payment";

type PaymentStatus = "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
type UserPlan = "FREE" | "PRO" | "BUSINESS";
type PaidPlan = "PRO" | "BUSINESS";

type MockTransaction = {
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: PaymentStatus;
  userEmail: string;
  userId: string;
  userName: string | null;
};

type UpdateStatusInput = {
  expectedStatus: PaymentStatus;
  orderId: string;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  status: PaymentStatus;
};

type SubscriptionInput = {
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  plan: PaidPlan;
  userId: string;
};

type InvoiceInput = {
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  periodEnd: Date;
  periodStart: Date;
  plan: PaidPlan;
  providerTransactionId: string | null;
  to: string;
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
  invoiceInputs: [] as InvoiceInput[],
  subscriptions: [] as SubscriptionInput[],
  transaction: null as MockTransaction | null,
  updateInputs: [] as UpdateStatusInput[],
  userPlanUpdates: [] as Array<{ plan: PaidPlan; userId: string }>,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findPaymentTransactionByOrderId: async (orderId: string) =>
    mockState.transaction?.orderId === orderId ? mockState.transaction : null,
  updatePaymentTransactionStatus: async (input: UpdateStatusInput) => {
    mockState.updateInputs.push(input);
    if (
      !mockState.transaction ||
      mockState.transaction.orderId !== input.orderId ||
      mockState.transaction.status !== input.expectedStatus
    ) {
      return null;
    }

    mockState.transaction = {
      ...mockState.transaction,
      paidAt: input.paidAt ?? mockState.transaction.paidAt,
      paymentMethod: input.paymentMethod ?? mockState.transaction.paymentMethod,
      status: input.status,
    };

    return mockState.transaction;
  },
  updateUserPlanForPayment: async (input: { plan: PaidPlan; userId: string }) => {
    mockState.userPlanUpdates.push(input);
    return { id: input.userId };
  },
  upsertActiveSubscriptionForUser: async (input: SubscriptionInput) => {
    mockState.subscriptions.push(input);
    return { id: "subscription-1" };
  },
}));

vi.mock("@/lib/email/payment-emails", () => ({
  sendPaymentInvoiceEmail: async (input: InvoiceInput) => {
    mockState.invoiceInputs.push(input);
  },
}));

import { POST } from "../../src/app/api/v1/payments/webhook/route";

function createTransaction(
  overrides: Partial<MockTransaction> = {},
): MockTransaction {
  return {
    duration: "MONTHLY",
    grossAmountIdr: 128000,
    grossAmountUsd: 8,
    orderId: "LS-123",
    paidAt: null,
    paymentMethod: null,
    plan: "PRO",
    status: "PENDING",
    userEmail: "buyer@example.com",
    userId: "user-1",
    userName: "Rafi Link",
    ...overrides,
  };
}

function createWebhookPayload(
  overrides: Partial<PayGateWebhookPayload> = {},
): PayGateWebhookPayload {
  return {
    amount: 128000,
    currency: "IDR",
    event: "transaction.updated",
    midtrans: {
      fraud_status: "accept",
      transaction_id: "trx-1",
      transaction_status: "settlement",
    },
    order_id: "LS-123",
    paid_at: "2026-05-07T08:00:00+07:00",
    payment_type: "bank_transfer",
    status: "paid",
    store_id: "st_123",
    transaction_id: "paygate-transaction-1",
    webhook_id: "wd_123",
    ...overrides,
  };
}

function signPayload(rawBody: string, timestamp: string, secret = "webhook-secret"): string {
  return `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex")}`;
}

function createRequest(
  body: unknown,
  {
    signature,
    timestamp = "2026-05-07T08:00:00+07:00",
  }: {
    signature?: string;
    timestamp?: string;
  } = {},
): NextRequest {
  const rawBody = JSON.stringify(body);

  return new NextRequest("http://localhost:3000/api/v1/payments/webhook", {
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "x-webhook-signature": signature ?? signPayload(rawBody, timestamp),
      "x-webhook-timestamp": timestamp,
    },
    method: "POST",
  });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("payment webhook API", () => {
  beforeEach(() => {
    process.env.PAYGATE_WEBHOOK_SECRET = "webhook-secret";
    mockState.invoiceInputs = [];
    mockState.subscriptions = [];
    mockState.transaction = createTransaction();
    mockState.updateInputs = [];
    mockState.userPlanUpdates = [];
  });

  it("should process a paid webhook and activate subscription", async () => {
    const response = await POST(createRequest(createWebhookPayload()));
    const body = await readJson<{
      activatedSubscription: boolean;
      ignored: boolean;
      orderId: string;
      status: PaymentStatus;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({
      activatedSubscription: true,
      ignored: false,
      orderId: "LS-123",
      status: "SETTLEMENT",
    });
    expect(mockState.updateInputs).toMatchObject([
      {
        expectedStatus: "PENDING",
        orderId: "LS-123",
        paymentMethod: "bank_transfer",
        status: "SETTLEMENT",
      },
    ]);
    expect(mockState.updateInputs[0]?.paidAt?.toISOString()).toBe(
      "2026-05-07T01:00:00.000Z",
    );
    expect(mockState.subscriptions).toHaveLength(1);
    expect(mockState.subscriptions[0]?.currentPeriodStart.toISOString()).toBe(
      "2026-05-07T01:00:00.000Z",
    );
    expect(mockState.subscriptions[0]?.plan).toBe("PRO");
    expect(mockState.userPlanUpdates).toEqual([{ plan: "PRO", userId: "user-1" }]);
    expect(mockState.invoiceInputs).toMatchObject([
      {
        duration: "MONTHLY",
        grossAmountIdr: 128000,
        grossAmountUsd: 8,
        orderId: "LS-123",
        paymentMethod: "bank_transfer",
        plan: "PRO",
        providerTransactionId: "paygate-transaction-1",
        to: "buyer@example.com",
      },
    ]);
    expect(mockState.invoiceInputs[0]?.paidAt?.toISOString()).toBe(
      "2026-05-07T01:00:00.000Z",
    );
    expect(mockState.invoiceInputs[0]?.periodStart.toISOString()).toBe(
      "2026-05-07T01:00:00.000Z",
    );
    expect(mockState.invoiceInputs[0]?.periodEnd.toISOString()).toBe(
      "2026-06-07T01:00:00.000Z",
    );
  });

  it("should update pending notifications without activating subscription", async () => {
    const response = await POST(
      createRequest(
        createWebhookPayload({
          paid_at: undefined,
          status: "pending",
        }),
      ),
    );
    const body = await readJson<{
      activatedSubscription: boolean;
      ignored: boolean;
      status: PaymentStatus;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.status).toBe("PENDING");
    expect(body.data.ignored).toBe(true);
    expect(mockState.subscriptions).toEqual([]);
    expect(mockState.invoiceInputs).toEqual([]);
  });

  it("should ignore duplicate settled notifications", async () => {
    mockState.transaction = createTransaction({
      paidAt: new Date("2026-05-07T01:00:00.000Z"),
      status: "SETTLEMENT",
    });

    const response = await POST(createRequest(createWebhookPayload()));
    const body = await readJson<{ ignored: boolean; status: PaymentStatus }>(
      response,
    );

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      ignored: true,
      status: "SETTLEMENT",
    });
    expect(mockState.updateInputs).toEqual([]);
    expect(mockState.subscriptions).toEqual([]);
    expect(mockState.invoiceInputs).toEqual([]);
  });

  it("should reject invalid signatures", async () => {
    const response = await POST(
      createRequest(createWebhookPayload(), {
        signature: "sha256=bad-signature",
      }),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("INVALID_SIGNATURE");
    expect(mockState.updateInputs).toEqual([]);
  });

  it("should reject amount mismatches", async () => {
    const response = await POST(
      createRequest(
        createWebhookPayload({
          amount: 999999,
        }),
      ),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_AMOUNT_MISMATCH");
  });

  it("should return not found for unknown order IDs", async () => {
    mockState.transaction = null;

    const response = await POST(createRequest(createWebhookPayload()));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_ORDER_NOT_FOUND");
  });
});
