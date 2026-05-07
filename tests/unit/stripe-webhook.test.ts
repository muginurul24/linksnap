import Stripe from "stripe";
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

type SubscriptionInput = {
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  plan: PaidPlan;
  userId: string;
};

const mockState = vi.hoisted(() => ({
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "PRO" as UserPlan,
  },
  expiredSubscriptions: [] as Array<{ expiredAt: Date; userId: string }>,
  subscriptions: [] as SubscriptionInput[],
  transaction: null as MockTransaction | null,
  updateInputs: [] as UpdateStatusInput[],
  userPlanUpdates: [] as Array<{ plan: UserPlan; userId: string }>,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  expireSubscriptionForUser: async (input: { expiredAt: Date; userId: string }) => {
    mockState.expiredSubscriptions.push(input);
    return { id: "subscription-1" };
  },
  findBillingUserById: async () => mockState.billingUser,
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
  upsertActiveSubscriptionForUser: async (input: SubscriptionInput) => {
    mockState.subscriptions.push(input);
    return { id: "subscription-1" };
  },
}));

vi.mock("@/lib/email/payment-emails", () => ({
  sendPaymentInvoiceEmail: async () => undefined,
}));

import {
  StripeSignatureVerificationError,
  handleStripeWebhook,
  verifyStripeWebhookSignature,
} from "../../src/lib/payments/stripe-webhook";

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

function createCheckoutCompletedEvent(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Event {
  return {
    api_version: "2024-06-20",
    created: 1777777777,
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
        ...overrides,
      },
    },
    id: "evt_checkout",
    livemode: false,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type: "checkout.session.completed",
  } as unknown as Stripe.Event;
}

function createSubscriptionEvent(
  status: Stripe.Subscription.Status,
  type: "customer.subscription.deleted" | "customer.subscription.updated",
): Stripe.Event {
  return {
    api_version: "2024-06-20",
    created: 1777777777,
    data: {
      object: {
        id: "sub_123",
        object: "subscription",
        canceled_at: 1777778888,
        current_period_end: 1780369777,
        current_period_start: 1777777777,
        metadata: {
          duration: "MONTHLY",
          orderId: "LS-ST-1777777777777-abcdef123456",
          plan: "PRO",
          userId: "user-1",
        },
        status,
      },
    },
    id: `evt_${type}`,
    livemode: false,
    object: "event",
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

describe("Stripe webhook helpers", () => {
  beforeEach(() => {
    mockState.expiredSubscriptions = [];
    mockState.subscriptions = [];
    mockState.transaction = createTransaction();
    mockState.updateInputs = [];
    mockState.userPlanUpdates = [];
  });

  it("should verify Stripe signatures against the raw request body", () => {
    const client = new Stripe("sk_test_unit");
    const payload = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "checkout.session.completed",
    });
    const signature = client.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_unit",
    });

    const event = verifyStripeWebhookSignature(
      payload,
      signature,
      "whsec_unit",
      client,
    );

    expect(event.type).toBe("checkout.session.completed");
    expect(() =>
      verifyStripeWebhookSignature(payload, "bad-signature", "whsec_unit", client),
    ).toThrow(StripeSignatureVerificationError);
  });

  it("should settle checkout sessions and activate subscriptions", async () => {
    const result = await handleStripeWebhook(createCheckoutCompletedEvent());

    expect(result).toEqual({
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
    expect(mockState.userPlanUpdates).toEqual([{ plan: "PRO", userId: "user-1" }]);
    expect(mockState.subscriptions).toHaveLength(1);
  });

  it("should ignore duplicate completed checkout sessions", async () => {
    mockState.transaction = createTransaction({
      paidAt: new Date("2026-05-07T01:00:00.000Z"),
      status: "SETTLEMENT",
    });

    const result = await handleStripeWebhook(createCheckoutCompletedEvent());

    expect(result.ignored).toBe(true);
    expect(mockState.updateInputs).toEqual([]);
    expect(mockState.subscriptions).toEqual([]);
  });

  it("should sync active subscription updates from Stripe metadata", async () => {
    const result = await handleStripeWebhook(
      createSubscriptionEvent("active", "customer.subscription.updated"),
    );

    expect(result).toMatchObject({
      activatedSubscription: true,
      eventType: "customer.subscription.updated",
      ignored: false,
      userId: "user-1",
    });
    expect(mockState.subscriptions[0]).toMatchObject({
      plan: "PRO",
      userId: "user-1",
    });
    expect(mockState.userPlanUpdates).toContainEqual({
      plan: "PRO",
      userId: "user-1",
    });
  });

  it("should expire deleted Stripe subscriptions and downgrade the user", async () => {
    const result = await handleStripeWebhook(
      createSubscriptionEvent("canceled", "customer.subscription.deleted"),
    );

    expect(result).toMatchObject({
      activatedSubscription: false,
      eventType: "customer.subscription.deleted",
      ignored: false,
      userId: "user-1",
    });
    expect(mockState.expiredSubscriptions).toHaveLength(1);
    expect(mockState.userPlanUpdates).toContainEqual({
      plan: "FREE",
      userId: "user-1",
    });
  });
});
