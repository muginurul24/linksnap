import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockHeaders = {
  value: Headers;
};

type MockBillingUser = {
  email: string;
  name: string | null;
  plan: UserPlan;
};

type MockBillingTransaction = {
  createdAt: Date;
  duration: string;
  gateway: "midtrans";
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

const mockHeaders = vi.hoisted<MockHeaders>(() => ({
  value: new Headers(),
}));

const mockState = vi.hoisted(() => ({
  billingUser: {
    email: "buyer@example.com",
    name: "Rafi Link",
    plan: "FREE" as UserPlan,
  } as MockBillingUser | null,
  geoIp: null as {
    city: string | null;
    country: string | null;
    region: string | null;
  } | null,
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

vi.mock("next/headers", () => ({
  headers: async () => mockHeaders.value,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/geo/geoip", () => ({
  lookupGeoIp: async () => mockState.geoIp,
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

describe("billing page gateway country detection", () => {
  beforeEach(() => {
    mockHeaders.value = new Headers();
    mockState.billingUser = {
      email: "buyer@example.com",
      name: "Rafi Link",
      plan: "FREE",
    };
    mockState.geoIp = null;
    mockState.history = {
      items: [],
      total: 0,
    };
    mockState.subscription = null;
  });

  it("should render Indonesia gateway availability data", async () => {
    mockHeaders.value = new Headers({
      "x-vercel-ip-country": "ID",
    });

    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('data-client-country="ID"');
    expect(markup).toContain('data-payment-gateways="midtrans"');
    expect(markup).toContain("Midtrans");
  });

  it("should render Midtrans gateway availability data for non-Indonesia", async () => {
    mockHeaders.value = new Headers({
      "x-vercel-ip-country": "US",
    });

    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('data-client-country="US"');
    expect(markup).toContain('data-payment-gateways="midtrans"');
    expect(markup).toContain("Midtrans");
  });

  it("should render transaction history for Midtrans payments", async () => {
    mockHeaders.value = new Headers({
      "x-vercel-ip-country": "ID",
    });
    mockState.history = {
      items: [
        {
          createdAt: new Date("2026-05-07T07:00:00.000Z"),
          duration: "MONTHLY",
          gateway: "midtrans",
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
      total: 2,
    };

    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Gateway");
    expect(markup).toContain("Midtrans");
    expect(markup).toContain("Bank Transfer");
  });
});
