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
    items: [],
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
    expect(markup).toContain('data-payment-gateways="midtrans,stripe"');
  });

  it("should render Stripe-only gateway availability data for non-Indonesia", async () => {
    mockHeaders.value = new Headers({
      "x-vercel-ip-country": "US",
    });

    const element = await BillingPage({
      searchParams: Promise.resolve({}),
    });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('data-client-country="US"');
    expect(markup).toContain('data-payment-gateways="stripe"');
  });
});
