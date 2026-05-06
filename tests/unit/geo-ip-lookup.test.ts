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
  lookupGeoLocation,
  readEdgeGeoHeaders,
} from "../../src/lib/geo/ip-lookup";

describe("geo IP lookup wrapper", () => {
  beforeEach(() => {
    mockState.geoIp = null;
    mockState.lookupCalls = [];
  });

  it("should decode edge geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-city": "Jakarta%20Selatan",
      "x-vercel-ip-country": "ID",
      "x-vercel-ip-country-region": "JK",
    });

    expect(readEdgeGeoHeaders(headers)).toEqual({
      city: "Jakarta Selatan",
      country: "ID",
      region: "JK",
    });
  });

  it("should prefer MaxMind geo data when public IP resolves", async () => {
    mockState.geoIp = {
      city: "Jakarta",
      country: "ID",
      region: "JK",
    };

    await expect(
      lookupGeoLocation({
        edgeGeo: { city: "Singapore", country: "SG", region: null },
        ipAddress: "8.8.8.8",
      }),
    ).resolves.toEqual({
      city: "Jakarta",
      country: "ID",
      region: "JK",
      source: "maxmind",
    });
    expect(mockState.lookupCalls).toEqual(["8.8.8.8"]);
  });

  it("should fall back to edge geo headers when MaxMind data is unavailable", async () => {
    await expect(
      lookupGeoLocation({
        edgeGeo: { city: "Jakarta", country: "ID", region: "JK" },
        ipAddress: "203.0.113.10",
      }),
    ).resolves.toEqual({
      city: "Jakarta",
      country: "ID",
      region: "JK",
      source: "edge",
    });
  });

  it("should return empty geo data when no lookup source is available", async () => {
    await expect(
      lookupGeoLocation({
        edgeGeo: { city: null, country: null, region: null },
        ipAddress: null,
      }),
    ).resolves.toEqual({
      city: null,
      country: null,
      region: null,
      source: "none",
    });
  });
});
