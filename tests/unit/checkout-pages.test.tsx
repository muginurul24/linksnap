import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CheckoutTransactionSummary,
  SubscriptionRecord,
} from "../../src/lib/db/queries/payments";

type MockSession = {
  user: {
    id: string;
  };
} | null;

const mockState = vi.hoisted(() => ({
  session: { user: { id: "user-1" } } as MockSession,
  subscription: {
    canceledAt: null,
    createdAt: new Date("2026-05-07T08:00:00Z"),
    currentPeriodEnd: new Date("2026-06-07T08:00:00Z"),
    currentPeriodStart: new Date("2026-05-07T08:00:00Z"),
    id: "subscription-1",
    plan: "PRO",
    status: "ACTIVE",
    updatedAt: new Date("2026-05-07T08:00:00Z"),
    userId: "user-1",
  } as SubscriptionRecord | null,
  syncCalls: [] as string[],
  transaction: {
    createdAt: new Date("2026-05-07T08:00:00Z"),
    duration: "MONTHLY",
    grossAmountIdr: 128000,
    grossAmountUsd: 8,
    orderId: "LS-1777777777777-abcdef123456",
    paidAt: new Date("2026-05-07T08:05:00Z"),
    paymentMethod: "bank_transfer",
    plan: "PRO",
    status: "SETTLEMENT",
    updatedAt: new Date("2026-05-07T08:05:00Z"),
  } as CheckoutTransactionSummary | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/payments/subscription", () => ({
  syncSubscriptionStatusForUser: async (userId: string) => {
    mockState.syncCalls.push(userId);
  },
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findCheckoutTransactionByOrderId: async () => mockState.transaction,
  findSubscriptionByUserId: async () => mockState.subscription,
}));

import CheckoutCancelPage from "../../src/app/(marketing)/checkout/cancel/page";
import CheckoutSuccessPage from "../../src/app/(marketing)/checkout/success/page";

describe("checkout pages", () => {
  beforeEach(() => {
    mockState.session = { user: { id: "user-1" } };
    mockState.subscription = {
      canceledAt: null,
      createdAt: new Date("2026-05-07T08:00:00Z"),
      currentPeriodEnd: new Date("2026-06-07T08:00:00Z"),
      currentPeriodStart: new Date("2026-05-07T08:00:00Z"),
      id: "subscription-1",
      plan: "PRO",
      status: "ACTIVE",
      updatedAt: new Date("2026-05-07T08:00:00Z"),
      userId: "user-1",
    };
    mockState.syncCalls = [];
    mockState.transaction = {
      createdAt: new Date("2026-05-07T08:00:00Z"),
      duration: "MONTHLY",
      grossAmountIdr: 128000,
      grossAmountUsd: 8,
      orderId: "LS-1777777777777-abcdef123456",
      paidAt: new Date("2026-05-07T08:05:00Z"),
      paymentMethod: "bank_transfer",
      plan: "PRO",
      status: "SETTLEMENT",
      updatedAt: new Date("2026-05-07T08:05:00Z"),
    };
  });

  it("should render checkout success details for the transaction owner", async () => {
    const element = await CheckoutSuccessPage({
      searchParams: Promise.resolve({
        order_id: "LS-1777777777777-abcdef123456",
      }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Checkout complete");
    expect(markup).toContain("Pro Plan");
    expect(markup).toContain("Jun 7, 2026");
    expect(markup).toContain("LS-1777777777777-abcdef123456");
    expect(markup).toContain('href="/dashboard"');
    expect(mockState.syncCalls).toEqual(["user-1"]);
  });

  it("should render an unavailable state when the order id is invalid", async () => {
    const element = await CheckoutSuccessPage({
      searchParams: Promise.resolve({
        order_id: "bad-order",
      }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Checkout details unavailable");
    expect(markup).toContain('href="/settings/billing"');
    expect(mockState.syncCalls).toEqual([]);
  });

  it("should render checkout cancellation with retry action", async () => {
    const element = await CheckoutCancelPage({
      searchParams: Promise.resolve({
        order_id: "LS-1777777777777-abcdef123456",
        status: "unfinish",
      }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Payment was cancelled");
    expect(markup).toContain("LS-1777777777777-abcdef123456");
    expect(markup).toContain('href="/settings/billing"');
  });
});
