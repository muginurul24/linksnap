import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type CityResponse = {
  city?: {
    names?: {
      en?: string;
    };
  };
  country?: {
    isoCode?: string;
  };
  registeredCountry?: {
    isoCode?: string;
  };
  subdivisions?: Array<{
    isoCode?: string;
    names?: {
      en?: string;
    };
  }>;
};

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheSetCalls: [] as Array<{ key: string; ttl: number; value: unknown }>,
  cityCalls: [] as string[],
  openCalls: [] as string[],
  response: null as CityResponse | null,
  throwAddressNotFound: false,
  throwUnknownError: false,
}));

vi.mock("@maxmind/geoip2-node", () => {
  class MockAddressNotFoundError extends Error {}

  return {
    AddressNotFoundError: MockAddressNotFoundError,
    Reader: {
      open: async (dbPath: string) => {
        mockState.openCalls.push(dbPath);

        return {
          city: (ipAddress: string) => {
            mockState.cityCalls.push(ipAddress);

            if (mockState.throwAddressNotFound) {
              throw new MockAddressNotFoundError("not found");
            }

            if (mockState.throwUnknownError) {
              throw new Error("lookup failed");
            }

            return mockState.response ?? {};
          },
        };
      },
    },
  };
});

vi.mock("@/lib/redis", () => ({
  cacheGet: async <T>(key: string): Promise<T | null> =>
    (mockState.cache.get(key) as T | undefined) ?? null,
  cacheSet: async (key: string, value: unknown, ttl: number) => {
    mockState.cache.set(key, value);
    mockState.cacheSetCalls.push({ key, ttl, value });
  },
}));

import {
  getGeoIpCacheKey,
  isLocalOrPrivateIpAddress,
  lookupGeoIp,
} from "../../src/lib/geo/geoip";

const previousMaxMindDbPath = process.env.MAXMIND_DB_PATH;

describe("GeoIP", () => {
  beforeEach(() => {
    process.env.MAXMIND_DB_PATH = "/tmp/GeoLite2-City.mmdb";
    mockState.cache = new Map();
    mockState.cacheSetCalls = [];
    mockState.cityCalls = [];
    mockState.openCalls = [];
    mockState.response = null;
    mockState.throwAddressNotFound = false;
    mockState.throwUnknownError = false;
  });

  afterAll(() => {
    if (previousMaxMindDbPath === undefined) {
      delete process.env.MAXMIND_DB_PATH;
      return;
    }

    process.env.MAXMIND_DB_PATH = previousMaxMindDbPath;
  });

  it("should detect local and private IP addresses", () => {
    expect(isLocalOrPrivateIpAddress(null)).toBe(true);
    expect(isLocalOrPrivateIpAddress("127.0.0.1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("10.0.0.1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("172.16.0.1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("192.168.1.1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("::1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("fc00::1")).toBe(true);
    expect(isLocalOrPrivateIpAddress("8.8.8.8")).toBe(false);
  });

  it("should return null without cache or database reads for private IPs", async () => {
    await expect(lookupGeoIp("127.0.0.1")).resolves.toBeNull();
    await expect(lookupGeoIp("192.168.1.10")).resolves.toBeNull();

    expect(mockState.openCalls).toEqual([]);
    expect(mockState.cacheSetCalls).toEqual([]);
  });

  it("should cache MaxMind city results for public IPs", async () => {
    mockState.response = {
      city: { names: { en: "Jakarta" } },
      country: { isoCode: "ID" },
      subdivisions: [{ isoCode: "JK", names: { en: "Jakarta" } }],
    };

    await expect(lookupGeoIp("8.8.8.8")).resolves.toEqual({
      city: "Jakarta",
      country: "ID",
      region: "JK",
    });
    await expect(lookupGeoIp("8.8.8.8")).resolves.toEqual({
      city: "Jakarta",
      country: "ID",
      region: "JK",
    });

    expect(mockState.cityCalls).toEqual(["8.8.8.8"]);
    expect(mockState.cacheSetCalls).toEqual([
      {
        key: getGeoIpCacheKey("8.8.8.8"),
        ttl: 86_400,
        value: { city: "Jakarta", country: "ID", region: "JK" },
      },
    ]);
  });

  it("should return null when MaxMind database path is unavailable", async () => {
    delete process.env.MAXMIND_DB_PATH;

    await expect(lookupGeoIp("8.8.4.4")).resolves.toBeNull();

    expect(mockState.openCalls).toEqual([]);
    expect(mockState.cacheSetCalls).toEqual([]);
  });

  it("should return null when MaxMind has no address match", async () => {
    mockState.throwAddressNotFound = true;

    await expect(lookupGeoIp("8.8.4.4")).resolves.toBeNull();

    expect(mockState.cacheSetCalls).toEqual([]);
  });
});
