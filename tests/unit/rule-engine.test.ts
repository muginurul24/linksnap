import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SmartRuleRecord } from "../../src/lib/db/queries/smart-rules";

type GeoLookupResult = {
  city: string | null;
  country: string | null;
  source: "edge" | "maxmind" | "none";
};

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  geo: { city: null, country: null, source: "none" } as GeoLookupResult,
  listCalls: [] as string[],
  rules: [] as SmartRuleRecord[],
}));

vi.mock("@/lib/db/queries/smart-rules", () => ({
  listSmartRulesByLinkId: async (linkId: string) => {
    mockState.listCalls.push(linkId);
    return mockState.rules.filter((rule) => rule.linkId === linkId);
  },
}));

vi.mock("@/lib/geo/ip-lookup", () => ({
  lookupGeoLocation: async () => mockState.geo,
  readEdgeGeoHeaders: (headers: Headers) => ({
    city: headers.get("x-vercel-ip-city"),
    country: headers.get("x-vercel-ip-country"),
  }),
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async <T>(key: string): Promise<T | null> =>
    (mockState.cache.get(key) as T | undefined) ?? null,
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(key, value);
  },
}));

import {
  buildRuleEvaluationContext,
  evaluateSmartRulesForLink,
  getSmartRulesCacheKey,
} from "../../src/lib/rules/rule-engine";

function createRule(overrides: Partial<SmartRuleRecord>): SmartRuleRecord {
  return {
    condition: { device: "mobile" },
    destinationUrl: "https://example.com/default",
    id: "rule-default",
    linkId: "link-1",
    priority: 0,
    type: "DEVICE",
    ...overrides,
  };
}

function createContext(
  overrides: Partial<Parameters<typeof evaluateSmartRulesForLink>[0]["context"]> = {},
): Parameters<typeof evaluateSmartRulesForLink>[0]["context"] {
  return {
    acceptLanguage: null,
    edgeGeo: { city: null, country: null },
    ipAddress: "203.0.113.10",
    timestamp: new Date("2026-05-07T00:30:00.000Z"),
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    ...overrides,
  };
}

describe("rule engine", () => {
  beforeEach(() => {
    mockState.cache = new Map();
    mockState.geo = { city: null, country: null, source: "none" };
    mockState.listCalls = [];
    mockState.rules = [];
  });

  it("should build evaluation context from request headers", () => {
    const headers = new Headers({
      "accept-language": "id-ID,id;q=0.9",
      "user-agent": "Vitest",
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
      "x-vercel-ip-city": "Jakarta",
      "x-vercel-ip-country": "ID",
    });

    expect(
      buildRuleEvaluationContext(headers, new Date("2026-05-07T00:00:00.000Z")),
    ).toEqual({
      acceptLanguage: "id-ID,id;q=0.9",
      edgeGeo: { city: "Jakarta", country: "ID" },
      ipAddress: "203.0.113.10",
      timestamp: new Date("2026-05-07T00:00:00.000Z"),
      userAgent: "Vitest",
    });
  });

  it("should return highest priority device destination when multiple rules match", async () => {
    mockState.rules = [
      createRule({
        destinationUrl: "https://example.com/mobile-low",
        id: "rule-low",
        priority: 10,
      }),
      createRule({
        destinationUrl: "https://example.com/mobile-high",
        id: "rule-high",
        priority: 50,
      }),
    ];

    const result = await evaluateSmartRulesForLink({
      context: createContext(),
      linkId: "link-1",
      slug: "promo",
    });

    expect(result).toEqual({
      destinationUrl: "https://example.com/mobile-high",
      ruleId: "rule-high",
    });
  });

  it("should match GEO rules when country or city is allowed", async () => {
    mockState.geo = { city: "Jakarta", country: "ID", source: "maxmind" };
    mockState.rules = [
      createRule({
        condition: { cities: ["Bandung", "Jakarta"], countries: ["SG"] },
        destinationUrl: "https://example.com/jakarta",
        id: "rule-geo",
        priority: 10,
        type: "GEO",
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/jakarta",
      ruleId: "rule-geo",
    });
  });

  it("should match TIME rules when time range wraps midnight", async () => {
    mockState.rules = [
      createRule({
        condition: { end: "02:00", start: "23:00", timezone: "UTC" },
        destinationUrl: "https://example.com/late",
        id: "rule-time",
        priority: 10,
        type: "TIME",
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext({
          timestamp: new Date("2026-05-07T00:30:00.000Z"),
        }),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/late",
      ruleId: "rule-time",
    });
  });

  it("should match LANGUAGE rules when accepted language has locale", async () => {
    mockState.rules = [
      createRule({
        condition: { languages: ["id"] },
        destinationUrl: "https://example.com/id",
        id: "rule-language",
        priority: 10,
        type: "LANGUAGE",
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext({ acceptLanguage: "id-ID,id;q=0.9,en;q=0.8" }),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/id",
      ruleId: "rule-language",
    });
  });

  it("should reuse cached rules when slug cache is populated", async () => {
    mockState.cache.set(getSmartRulesCacheKey("promo"), [
      createRule({
        destinationUrl: "https://example.com/cached",
        id: "rule-cached",
        priority: 10,
      }),
    ]);
    mockState.rules = [
      createRule({
        destinationUrl: "https://example.com/database",
        id: "rule-database",
        priority: 10,
      }),
    ];

    const result = await evaluateSmartRulesForLink({
      context: createContext(),
      linkId: "link-1",
      slug: "promo",
    });

    expect(result).toEqual({
      destinationUrl: "https://example.com/cached",
      ruleId: "rule-cached",
    });
    expect(mockState.listCalls).toEqual([]);
  });

  it("should return null when no rule matches", async () => {
    mockState.rules = [
      createRule({
        condition: { device: "desktop" },
        destinationUrl: "https://example.com/desktop",
        id: "rule-desktop",
        priority: 10,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toBeNull();
  });
});
