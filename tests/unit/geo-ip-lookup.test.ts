import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  lookupGeoLocation,
  readEdgeGeoHeaders,
} from "../../src/lib/geo/ip-lookup";

const previousMaxMindDbPath = process.env.MAXMIND_DB_PATH;

describe("geo IP lookup", () => {
  beforeEach(() => {
    delete process.env.MAXMIND_DB_PATH;
  });

  afterAll(() => {
    if (previousMaxMindDbPath === undefined) {
      delete process.env.MAXMIND_DB_PATH;
      return;
    }

    process.env.MAXMIND_DB_PATH = previousMaxMindDbPath;
  });

  it("should decode edge geo headers", () => {
    const headers = new Headers({
      "x-vercel-ip-city": "Jakarta%20Selatan",
      "x-vercel-ip-country": "ID",
    });

    expect(readEdgeGeoHeaders(headers)).toEqual({
      city: "Jakarta Selatan",
      country: "ID",
    });
  });

  it("should fall back to edge geo headers when MaxMind database is unavailable", async () => {
    await expect(
      lookupGeoLocation({
        edgeGeo: { city: "Jakarta", country: "ID" },
        ipAddress: "203.0.113.10",
      }),
    ).resolves.toEqual({
      city: "Jakarta",
      country: "ID",
      source: "edge",
    });
  });
});
