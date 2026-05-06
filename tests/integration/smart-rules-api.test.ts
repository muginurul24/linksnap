import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockLink = {
  id: string;
  slug: string;
  userId: string;
};

type MockSmartRule = {
  condition: unknown;
  destinationUrl: string;
  id: string;
  linkId: string;
  priority: number;
  type: "DEVICE" | "GEO" | "LANGUAGE" | "TIME";
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type SmartRulesApiResponse = {
  linkId: string;
  rules: MockSmartRule[];
};

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const ruleId = "86a44288-06d2-4662-9b49-0b51c7b11f2b";

const mockState = vi.hoisted(() => ({
  cacheDeleteKeys: [] as string[],
  links: [] as MockLink[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  rules: [] as MockSmartRule[],
  session: { user: { id: "user-1" } } as MockSession,
  userPlan: "PRO" as UserPlan | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    mockState.cacheDeleteKeys.push(key);
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/smart-rules", () => ({
  deleteSmartRuleForLink: async ({
    linkId,
    ruleId,
  }: {
    linkId: string;
    ruleId: string;
  }) => {
    const rule = mockState.rules.find(
      (item) => item.linkId === linkId && item.id === ruleId,
    );
    mockState.rules = mockState.rules.filter((item) => item !== rule);
    return rule ? { id: rule.id } : null;
  },
  listSmartRulesByLinkId: async (id: string) =>
    mockState.rules.filter((rule) => rule.linkId === id),
  replaceSmartRulesForLink: async ({
    linkId,
    rules,
  }: {
    linkId: string;
    rules: Array<{
      condition: unknown;
      destinationUrl: string;
      priority: number;
      type: MockSmartRule["type"];
    }>;
  }) => {
    mockState.rules = [
      ...mockState.rules.filter((rule) => rule.linkId !== linkId),
      ...rules.map((rule, index) => ({
        ...rule,
        id: index === 0 ? ruleId : `00000000-0000-4000-8000-${index
          .toString()
          .padStart(12, "0")}`,
        linkId,
      })),
    ];
    return mockState.rules.filter((rule) => rule.linkId === linkId);
  },
}));

import {
  DELETE,
  GET,
  POST,
} from "../../src/app/api/v1/links/[id]/rules/route";

function createRequest(method: string, body?: unknown, query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}/rules${query}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createContext(id = linkId) {
  return { params: Promise.resolve({ id }) };
}

function createMockLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    id: linkId,
    slug: "promo",
    userId: "user-1",
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("Smart Rules API", () => {
  beforeEach(() => {
    mockState.cacheDeleteKeys = [];
    mockState.links = [createMockLink()];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.rules = [];
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should replace Smart Rules for an owned link", async () => {
    const response = await POST(
      createRequest("POST", {
        rules: [
          {
            condition: { device: "mobile" },
            destinationUrl: "https://example.com/mobile",
            priority: 10,
            type: "DEVICE",
          },
        ],
      }),
      createContext(),
    );
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.rules).toMatchObject([
      {
        destinationUrl: "https://example.com/mobile",
        linkId,
        priority: 10,
        type: "DEVICE",
      },
    ]);
    expect(mockState.cacheDeleteKeys).toEqual(["redirect:promo"]);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:rules:post:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should list Smart Rules for an owned link", async () => {
    mockState.rules = [
      {
        condition: { country: "ID" },
        destinationUrl: "https://example.com/id",
        id: ruleId,
        linkId,
        priority: 5,
        type: "GEO",
      },
    ];

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.rules).toEqual(mockState.rules);
  });

  it("should delete one Smart Rule for an owned link", async () => {
    mockState.rules = [
      {
        condition: { device: "mobile" },
        destinationUrl: "https://example.com/mobile",
        id: ruleId,
        linkId,
        priority: 10,
        type: "DEVICE",
      },
    ];

    const response = await DELETE(
      createRequest("DELETE", undefined, `?ruleId=${ruleId}`),
      createContext(),
    );
    const body = await readJson<{ deleted: boolean; ruleId: string }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ deleted: true, ruleId });
    expect(mockState.rules).toEqual([]);
    expect(mockState.cacheDeleteKeys).toEqual(["redirect:promo"]);
  });

  it("should reject Smart Rule quota overages", async () => {
    mockState.userPlan = "FREE";

    const response = await POST(
      createRequest("POST", {
        rules: [0, 1, 2].map((index) => ({
          condition: { value: index },
          destinationUrl: `https://example.com/${index}`,
          priority: index,
          type: "GEO",
        })),
      }),
      createContext(),
    );
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("SMART_RULE_QUOTA_EXCEEDED");
  });

  it("should reject direct object reference access", async () => {
    mockState.links = [createMockLink({ userId: "user-2" })];

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should reject invalid input", async () => {
    const response = await POST(
      createRequest("POST", {
        rules: [
          {
            condition: {},
            destinationUrl: "javascript:alert(1)",
            type: "DEVICE",
          },
        ],
      }),
      createContext(),
    );
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject rate limited requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<SmartRulesApiResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
