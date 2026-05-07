import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  geoIp: null as {
    city: string | null;
    country: string | null;
    region: string | null;
  } | null,
  lookupCalls: [] as Array<string | null>,
}));

vi.mock("@/lib/geo/geoip", () => ({
  lookupGeoIp: async (ipAddress: string | null) => {
    mockState.lookupCalls.push(ipAddress);
    return mockState.geoIp;
  },
}));

import {
  detectBillingClientCountry,
  getAvailablePaymentGateways,
} from "../../src/lib/payments/gateway-selection";

describe("payment gateway country selection", () => {
  beforeEach(() => {
    mockState.geoIp = null;
    mockState.lookupCalls = [];
  });

  it("should offer Midtrans and Stripe for Indonesia clients", () => {
    expect(getAvailablePaymentGateways("ID")).toEqual(["midtrans", "stripe"]);
  });

  it("should offer Stripe only for non-Indonesia and unknown clients", () => {
    expect(getAvailablePaymentGateways("US")).toEqual(["stripe"]);
    expect(getAvailablePaymentGateways(null)).toEqual(["stripe"]);
  });

  it("should prefer MaxMind country detection over edge country headers", async () => {
    mockState.geoIp = {
      city: "Jakarta",
      country: "ID",
      region: "JK",
    };

    const country = await detectBillingClientCountry(
      new Headers({
        "x-forwarded-for": "8.8.8.8",
        "x-vercel-ip-country": "SG",
      }),
    );

    expect(country).toBe("ID");
    expect(mockState.lookupCalls).toEqual(["8.8.8.8"]);
  });

  it("should fall back to edge country headers when MaxMind is unavailable", async () => {
    const country = await detectBillingClientCountry(
      new Headers({
        "x-vercel-ip-country": "ID",
      }),
    );

    expect(country).toBe("ID");
    expect(mockState.lookupCalls).toEqual([null]);
  });
});
