import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";
type PaidPlan = "PRO" | "BUSINESS";

type MockSubscription = {
  canceledAt: Date | null;
  createdAt: Date;
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  id: string;
  plan: UserPlan;
  status: string;
  updatedAt: Date;
  userId: string;
};

type MockPaymentTransaction = {
  duration: string;
  gateway: "midtrans" | "stripe";
  grossAmountIdr: number;
  grossAmountUsd: number;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
  userEmail: string;
  userId: string;
  userName: string | null;
};

const mockState = vi.hoisted(() => ({
  expiredCandidates: [] as Array<{ id: string; userId: string }>,
  expiredIds: [] as string[],
  invoiceInputs: [] as unknown[],
  subscription: null as MockSubscription | null,
  upsertInputs: [] as unknown[],
  userPlanUpdates: [] as Array<{ plan: UserPlan; userId: string }>,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  expireSubscriptionForUser: async ({
    expiredAt,
    userId,
  }: {
    expiredAt: Date;
    userId: string;
  }) => {
    if (!mockState.subscription || mockState.subscription.userId !== userId) {
      return null;
    }

    mockState.subscription = {
      ...mockState.subscription,
      canceledAt: expiredAt,
      status: "EXPIRED",
    };

    return { id: mockState.subscription.id };
  },
  expireSubscriptionsByIds: async ({ ids }: { ids: string[] }) => {
    mockState.expiredIds = ids;
    return ids.length;
  },
  findSubscriptionByUserId: async (userId: string) =>
    mockState.subscription?.userId === userId ? mockState.subscription : null,
  listExpiredActiveSubscriptions: async () => mockState.expiredCandidates,
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
  updateUserPlansToFree: async (userIds: string[]) => {
    for (const userId of userIds) {
      mockState.userPlanUpdates.push({ plan: "FREE", userId });
    }

    return userIds.length;
  },
  upsertActiveSubscriptionForUser: async (input: unknown) => {
    mockState.upsertInputs.push(input);
    return { id: "subscription-1" };
  },
}));

vi.mock("@/lib/email/payment-emails", () => ({
  sendPaymentInvoiceEmail: async (input: unknown) => {
    mockState.invoiceInputs.push(input);
  },
}));

import {
  calculateSubscriptionPeriodEnd,
  createOrRenewSubscriptionForPayment,
  expireDueSubscriptions,
  syncSubscriptionStatusForUser,
} from "../../src/lib/payments/subscription";

function createSubscription(
  overrides: Partial<MockSubscription> = {},
): MockSubscription {
  return {
    canceledAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
    currentPeriodStart: new Date("2026-05-01T00:00:00.000Z"),
    id: "subscription-1",
    plan: "PRO",
    status: "ACTIVE",
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    userId: "user-1",
    ...overrides,
  };
}

function createTransaction(
  overrides: Partial<MockPaymentTransaction> = {},
): MockPaymentTransaction {
  return {
    duration: "MONTHLY",
    gateway: "midtrans",
    grossAmountIdr: 128000,
    grossAmountUsd: 8,
    orderId: "LS-123",
    paidAt: new Date("2026-05-07T01:00:00.000Z"),
    paymentMethod: "bank_transfer",
    plan: "PRO",
    status: "SETTLEMENT",
    userEmail: "buyer@example.com",
    userId: "user-1",
    userName: "Rafi Link",
    ...overrides,
  };
}

describe("subscription management", () => {
  beforeEach(() => {
    mockState.expiredCandidates = [];
    mockState.expiredIds = [];
    mockState.invoiceInputs = [];
    mockState.subscription = null;
    mockState.upsertInputs = [];
    mockState.userPlanUpdates = [];
  });

  it("should calculate monthly and yearly period ends", () => {
    expect(
      calculateSubscriptionPeriodEnd(
        new Date("2026-05-07T01:00:00.000Z"),
        "MONTHLY",
      ).toISOString(),
    ).toBe("2026-06-07T01:00:00.000Z");
    expect(
      calculateSubscriptionPeriodEnd(
        new Date("2026-05-07T01:00:00.000Z"),
        "YEARLY",
      ).toISOString(),
    ).toBe("2027-05-07T01:00:00.000Z");
  });

  it("should create or renew subscription from settled payment", async () => {
    await createOrRenewSubscriptionForPayment(createTransaction());

    expect(mockState.upsertInputs).toMatchObject([
      {
        plan: "PRO",
        userId: "user-1",
      },
    ]);
    expect(mockState.userPlanUpdates).toEqual([{ plan: "PRO", userId: "user-1" }]);
    expect(mockState.invoiceInputs).toMatchObject([
      {
        duration: "MONTHLY",
        orderId: "LS-123",
        plan: "PRO",
        to: "buyer@example.com",
      },
    ]);
  });

  it("should expire active subscription on dashboard status sync", async () => {
    mockState.subscription = createSubscription({
      currentPeriodEnd: new Date("2026-05-01T00:00:00.000Z"),
    });

    const snapshot = await syncSubscriptionStatusForUser(
      "user-1",
      new Date("2026-05-07T00:00:00.000Z"),
    );

    expect(snapshot).toMatchObject({
      expired: true,
      plan: "FREE",
    });
    expect(mockState.subscription?.status).toBe("EXPIRED");
    expect(mockState.userPlanUpdates).toEqual([{ plan: "FREE", userId: "user-1" }]);
  });

  it("should expire due subscriptions in batches for cron", async () => {
    mockState.expiredCandidates = [
      { id: "subscription-1", userId: "user-1" },
      { id: "subscription-2", userId: "user-2" },
    ];

    await expect(expireDueSubscriptions()).resolves.toEqual({
      downgradedUsers: 2,
      expiredSubscriptions: 2,
    });
    expect(mockState.expiredIds).toEqual(["subscription-1", "subscription-2"]);
    expect(mockState.userPlanUpdates).toEqual([
      { plan: "FREE", userId: "user-1" },
      { plan: "FREE", userId: "user-2" },
    ]);
  });
});
