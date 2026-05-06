import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashIpAddress } from "../../src/lib/analytics/ip";

type InsertedClick = {
  browser: string;
  city: string | null;
  country: string | null;
  device: string;
  ipHash: string | null;
  linkId: string;
  os: string;
  referrer: string | null;
  userAgent: string | null;
};

const mockState = vi.hoisted(() => ({
  insertedClicks: [] as InsertedClick[],
  shouldThrow: false,
}));

const previousIpHashSalt = process.env.IP_HASH_SALT;

vi.mock("@/lib/db/queries/click-events", () => ({
  insertClickEvents: async (events: InsertedClick[]) => {
    if (mockState.shouldThrow) throw new Error("insert failed");
    mockState.insertedClicks.push(...events);
  },
}));

vi.mock("@/lib/geo/ip-lookup", () => ({
  lookupGeoLocation: async ({
    edgeGeo,
  }: {
    edgeGeo: { city: string | null; country: string | null };
  }) => ({
    city: edgeGeo.city,
    country: edgeGeo.country,
    source: edgeGeo.city || edgeGeo.country ? "edge" : "none",
  }),
  readEdgeGeoHeaders: (headers: Headers) => ({
    city: headers.get("x-vercel-ip-city"),
    country: headers.get("x-vercel-ip-country"),
  }),
}));

import {
  buildRedirectClickInput,
  logRedirectClick,
} from "../../src/lib/analytics/click-logger";

describe("click logger", () => {
  beforeEach(() => {
    process.env.IP_HASH_SALT = "test-salt";
    mockState.insertedClicks = [];
    mockState.shouldThrow = false;
    vi.restoreAllMocks();
  });

  afterAll(() => {
    if (previousIpHashSalt === undefined) {
      delete process.env.IP_HASH_SALT;
      return;
    }

    process.env.IP_HASH_SALT = previousIpHashSalt;
  });

  it("should build redirect click input from request headers", () => {
    const headers = new Headers({
      "referer": "https://referrer.example",
      "user-agent": "Mozilla/5.0",
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
      "x-vercel-ip-city": "Jakarta",
      "x-vercel-ip-country": "ID",
    });

    expect(buildRedirectClickInput("link-1", headers)).toEqual({
      edgeGeo: { city: "Jakarta", country: "ID" },
      ipAddress: "203.0.113.10",
      linkId: "link-1",
      referrer: "https://referrer.example",
      userAgent: "Mozilla/5.0",
    });
  });

  it("should insert enriched redirect click metadata when logging succeeds", async () => {
    const userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";

    await logRedirectClick({
      edgeGeo: { city: "Jakarta", country: "ID" },
      ipAddress: "203.0.113.10",
      linkId: "link-1",
      referrer: "https://referrer.example",
      userAgent,
    });

    expect(mockState.insertedClicks).toEqual([
      {
        browser: "Safari",
        city: "Jakarta",
        country: "ID",
        device: "mobile",
        ipHash: hashIpAddress("203.0.113.10", "test-salt"),
        linkId: "link-1",
        os: "iOS",
        referrer: "https://referrer.example",
        userAgent,
      },
    ]);
    expect(mockState.insertedClicks[0]?.ipHash).not.toBe("203.0.113.10");
  });

  it("should swallow insert errors when database logging fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockState.shouldThrow = true;

    await expect(
      logRedirectClick({
        edgeGeo: { city: null, country: null },
        ipAddress: null,
        linkId: "link-1",
        referrer: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();

    expect(mockState.insertedClicks).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "[click-logger] failed to log redirect click",
      expect.any(Error),
    );
  });
});
