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
  isBotUserAgent,
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

function createV2Rule(
  overrides: Partial<SmartRuleRecord> & {
    condition?: Record<string, unknown>;
  },
): SmartRuleRecord {
  return createRule({
    type: "DEVICE",
    ...overrides,
    condition: {
      conditions: [
        {
          operator: "is",
          type: "device",
          value: "mobile",
        },
      ],
      isActive: true,
      version: 2,
      ...overrides.condition,
    },
  });
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

  it("should return first matching destination in display order", async () => {
    mockState.rules = [
      createRule({
        destinationUrl: "https://example.com/mobile-first",
        id: "rule-first",
        priority: 10,
      }),
      createRule({
        destinationUrl: "https://example.com/mobile-second",
        id: "rule-second",
        priority: 50,
      }),
    ];

    const result = await evaluateSmartRulesForLink({
      context: createContext(),
      linkId: "link-1",
      slug: "promo",
    });

    expect(result).toEqual({
      destinationUrl: "https://example.com/mobile-first",
      ruleId: "rule-first",
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

  it("should skip inactive V2 rules and continue in display order", async () => {
    mockState.rules = [
      createV2Rule({
        condition: { isActive: false },
        destinationUrl: "https://example.com/inactive",
        id: "rule-inactive",
        priority: 0,
      }),
      createV2Rule({
        destinationUrl: "https://example.com/active",
        id: "rule-active",
        priority: 1,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/active",
      ruleId: "rule-active",
    });
  });

  it("should require all V2 conditions to match with AND logic", async () => {
    mockState.geo = { city: "Jakarta", country: "ID", source: "maxmind" };
    mockState.rules = [
      createV2Rule({
        condition: {
          conditions: [
            { operator: "is", type: "country", value: "ID" },
            { operator: "is", type: "device", value: "desktop" },
          ],
        },
        destinationUrl: "https://example.com/desktop-id",
        id: "rule-v2",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toBeNull();

    mockState.cache = new Map();
    mockState.rules = [
      createV2Rule({
        condition: {
          conditions: [
            { operator: "is", type: "country", value: "ID" },
            { operator: "is", type: "device", value: "mobile" },
          ],
        },
        destinationUrl: "https://example.com/mobile-id",
        id: "rule-v2",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/mobile-id",
      ruleId: "rule-v2",
    });
  });

  it("should detect bot user agents with case-insensitive substrings", async () => {
    expect(isBotUserAgent("Mozilla/5.0 GPTBot/1.0")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 Safari/605.1")).toBe(false);

    mockState.rules = [
      createV2Rule({
        condition: {
          conditions: [{ operator: "is", type: "bot", value: ["GPTBot"] }],
        },
        destinationUrl: "https://example.com/bot",
        id: "rule-bot",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext({ userAgent: "Mozilla/5.0 GPTBot/1.0" }),
        linkId: "link-1",
        slug: "promo",
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/bot",
      ruleId: "rule-bot",
    });
  });

  it("should return fallback or default destinations for V2 no-match flows", async () => {
    mockState.rules = [
      createV2Rule({
        condition: {
          conditions: [{ operator: "is", type: "device", value: "desktop" }],
          fallbackDestinationUrl: "https://example.com/fallback",
        },
        destinationUrl: "https://example.com/desktop",
        id: "rule-desktop",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        defaultDestinationUrl: "https://example.com/default",
        linkId: "link-1",
        slug: "promo",
        smartRulesEnabled: true,
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/fallback",
      ruleId: null,
    });

    mockState.cache = new Map();
    mockState.rules = [
      createV2Rule({
        condition: {
          conditions: [{ operator: "is", type: "device", value: "desktop" }],
        },
        destinationUrl: "https://example.com/desktop",
        id: "rule-desktop",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        defaultDestinationUrl: "https://example.com/default",
        linkId: "link-1",
        slug: "promo",
        smartRulesEnabled: true,
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/default",
      ruleId: null,
    });
  });

  it("should ignore rules when Smart Rules are disabled for a link", async () => {
    mockState.rules = [
      createV2Rule({
        destinationUrl: "https://example.com/mobile",
        id: "rule-mobile",
        priority: 0,
      }),
    ];

    await expect(
      evaluateSmartRulesForLink({
        context: createContext(),
        defaultDestinationUrl: "https://example.com/default",
        linkId: "link-1",
        slug: "promo",
        smartRulesEnabled: false,
      }),
    ).resolves.toEqual({
      destinationUrl: "https://example.com/default",
      ruleId: null,
    });
  });
});
