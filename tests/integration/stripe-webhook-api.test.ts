import Stripe from "stripe";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PaymentStatus = "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
type UserPlan = "FREE" | "PRO" | "BUSINESS";
type PaidPlan = "PRO" | "BUSINESS";

type MockTransaction = {
  duration: string;
  gateway: "midtrans" | "stripe";
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

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  subscriptions: [] as unknown[],
  transaction: null as MockTransaction | null,
  updateInputs: [] as UpdateStatusInput[],
  userPlanUpdates: [] as Array<{ plan: UserPlan; userId: string }>,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  expireSubscriptionForUser: async () => ({ id: "subscription-1" }),
  findBillingUserById: async () => ({
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "PRO",
  }),
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
  updateUserPlanForSubscription: async (input: {
    plan: UserPlan;
    userId: string;
  }) => {
    mockState.userPlanUpdates.push(input);
    return { id: input.userId };
  },
  upsertActiveSubscriptionForUser: async (input: unknown) => {
    mockState.subscriptions.push(input);
    return { id: "subscription-1" };
  },
}));

vi.mock("@/lib/email/payment-emails", () => ({
  sendPaymentInvoiceEmail: async () => undefined,
}));

import { POST } from "../../src/app/api/v1/payments/stripe/webhook/route";

function createTransaction(
  overrides: Partial<MockTransaction> = {},
): MockTransaction {
  return {
    duration: "MONTHLY",
    gateway: "stripe",
    grossAmountIdr: 128000,
    grossAmountUsd: 8,
    orderId: "LS-ST-1777777777777-abcdef123456",
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

function createSignedRequest(payload: string, signature: string | null): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/payments/stripe/webhook", {
    body: payload,
    headers: {
      "content-type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    method: "POST",
  });
}

function createPayload(): string {
  return JSON.stringify({
    data: {
      object: {
        id: "cs_test_123",
        object: "checkout.session",
        client_reference_id: "user-1",
        created: 1777777777,
        metadata: {
          duration: "MONTHLY",
          orderId: "LS-ST-1777777777777-abcdef123456",
          plan: "PRO",
          userId: "user-1",
        },
        payment_method_types: ["card"],
      },
    },
    id: "evt_checkout",
    object: "event",
    type: "checkout.session.completed",
  });
}

function signPayload(payload: string, secret: string): string {
  return new Stripe("sk_test_unit").webhooks.generateTestHeaderString({
    payload,
    secret,
  });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("Stripe webhook API", () => {
  beforeEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit";
    mockState.subscriptions = [];
    mockState.transaction = createTransaction();
    mockState.updateInputs = [];
    mockState.userPlanUpdates = [];
  });

  it("should verify signature and process completed checkout sessions", async () => {
    const payload = createPayload();
    const response = await POST(
      createSignedRequest(payload, signPayload(payload, "whsec_unit")),
    );
    const body = await readJson<{
      activatedSubscription: boolean;
      eventType: string;
      ignored: boolean;
      orderId: string;
      userId: string;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({
      activatedSubscription: true,
      eventType: "checkout.session.completed",
      ignored: false,
      orderId: "LS-ST-1777777777777-abcdef123456",
      userId: "user-1",
    });
    expect(mockState.updateInputs).toMatchObject([
      {
        expectedStatus: "PENDING",
        orderId: "LS-ST-1777777777777-abcdef123456",
        paymentMethod: "card",
        status: "SETTLEMENT",
      },
    ]);
    expect(mockState.subscriptions).toHaveLength(1);
  });

  it("should reject missing Stripe signatures", async () => {
    const response = await POST(createSignedRequest(createPayload(), null));
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("INVALID_SIGNATURE");
    expect(mockState.updateInputs).toEqual([]);
  });

  it("should return not found for unknown Stripe order IDs", async () => {
    mockState.transaction = null;
    const payload = createPayload();

    const response = await POST(
      createSignedRequest(payload, signPayload(payload, "whsec_unit")),
    );
    const body = await readJson<unknown>(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PAYMENT_ORDER_NOT_FOUND");
  });
});
