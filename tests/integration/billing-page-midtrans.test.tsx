import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockBillingUser = {
  email: string;
  name: string | null;
  plan: UserPlan;
};

type MockBillingTransaction = {
  createdAt: Date;
  duration: string;
  grossAmountIdr: number;
  grossAmountUsd: number;
  id: string;
  orderId: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  plan: UserPlan;
  status: "PENDING" | "SETTLEMENT" | "CANCEL" | "DENY" | "EXPIRE";
  updatedAt: Date;
};

const mockState = vi.hoisted(() => ({
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "FREE" as UserPlan,
  } as MockBillingUser | null,
  history: {
    items: [] as MockBillingTransaction[],
    total: 0,
  },
  session: {
    user: {
      id: "user-1",
    },
  },
  subscription: null as null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/payments/subscription", () => ({
  syncSubscriptionStatusForUser: async () => undefined,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () => mockState.billingUser,
  findSubscriptionByUserId: async () => mockState.subscription,
  listPaymentTransactionsByUserId: async () => mockState.history,
}));

import BillingPage from "../../src/app/(dashboard)/settings/billing/page";

describe("billing page Midtrans checkout", () => {
  beforeEach(() => {
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "FREE",
    };
    mockState.history = {
      items: [],
      total: 0,
    };
    mockState.subscription = null;
  });

  it("should render a single upgrade control", async () => {
    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Upgrade to Pro");
    expect(markup).toContain("Upgrade to Business");
    expect(markup).not.toContain('type="radio"');
    expect(markup).not.toContain("data-payment-options");
    expect(markup).not.toContain("data-client-country");
  });

  it("should render transaction history without a gateway column", async () => {
    mockState.history = {
      items: [
        {
          createdAt: new Date("2026-05-07T07:00:00.000Z"),
          duration: "MONTHLY",
          grossAmountIdr: 128000,
          grossAmountUsd: 8,
          id: "transaction-midtrans",
          orderId: "LS-1777777777777-abcdef123456",
          paidAt: new Date("2026-05-07T07:05:00.000Z"),
          paymentMethod: "bank_transfer",
          plan: "PRO",
          status: "SETTLEMENT",
          updatedAt: new Date("2026-05-07T07:05:00.000Z"),
        },
      ],
      total: 1,
    };

    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain("Gateway");
    expect(markup).toContain("Bank Transfer");
  });
});
