import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockLink = {
  campaignId: string | null;
  clickCount: number;
  createdAt: Date;
  destinationUrl: string;
  expiresAt: Date | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: Date | null;
  slug: string;
  title: string | null;
  updatedAt: Date;
  userId: string;
};

type MockSplitTestVariant = {
  clickCount: number;
  destinationUrl: string;
  id: string;
  weight: number;
};

type MockSplitTest = {
  createdAt: Date;
  id: string;
  isActive: boolean;
  linkId: string;
  variants: MockSplitTestVariant[];
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

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";

const mockState = vi.hoisted(() => ({
  cacheDeletes: [] as string[],
  links: [] as MockLink[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  splitTest: null as MockSplitTest | null,
  userPlan: "PRO" as UserPlan | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    mockState.cacheDeletes.push(key);
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/split-tests", () => ({
  deleteSplitTestForLink: async (id: string) => {
    if (mockState.splitTest?.linkId !== id) return null;
    const deleted = { id: mockState.splitTest.id };
    mockState.splitTest = null;

    return deleted;
  },
  findSplitTestByLinkId: async (id: string) =>
    mockState.splitTest?.linkId === id ? mockState.splitTest : null,
  upsertSplitTestForLink: async ({
    linkId,
    variants,
  }: {
    linkId: string;
    variants: Array<{ destinationUrl: string; weight: number }>;
  }) => {
    mockState.splitTest = {
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "split-test-1",
      isActive: true,
      linkId,
      variants: variants.map((variant, index) => ({
        clickCount: index === 0 ? 7 : 3,
        destinationUrl: variant.destinationUrl,
        id: `variant-${index + 1}`,
        weight: variant.weight,
      })),
    };

    return mockState.splitTest;
  },
}));

import {
  DELETE,
  GET,
  POST,
} from "../../src/app/api/v1/links/[id]/split-test/route";

function createRequest(method = "GET", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}/split-test`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}

function createContext(id = linkId) {
  return { params: Promise.resolve({ id }) };
}

function createLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    campaignId: null,
    clickCount: 0,
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    destinationUrl: "https://example.com/default",
    expiresAt: null,
    hasLinkPage: false,
    id: linkId,
    isActive: true,
    scheduledAt: null,
    slug: "promo",
    title: "Promo",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    userId: "user-1",
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("split test API", () => {
  beforeEach(() => {
    mockState.cacheDeletes = [];
    mockState.links = [createLink()];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.splitTest = null;
    mockState.userPlan = "PRO";
  });

  it("should create or update split test variants for an owned link", async () => {
    const response = await POST(
      createRequest("POST", {
        variants: [
          { destinationUrl: "https://example.com/a", weight: 70 },
          { destinationUrl: "https://example.com/b", weight: 30 },
        ],
      }),
      createContext(),
    );
    const body = await readJson<{
      id: string;
      performance: { totalVariantClicks: number };
      variants: MockSplitTestVariant[];
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      id: "split-test-1",
      performance: { totalVariantClicks: 10 },
      variants: [
        { destinationUrl: "https://example.com/a", weight: 70 },
        { destinationUrl: "https://example.com/b", weight: 30 },
      ],
    });
    expect(mockState.cacheDeletes).toEqual(["redirect:promo"]);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:split-test:post:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should return split test config and performance for an owned link", async () => {
    mockState.splitTest = {
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "split-test-1",
      isActive: true,
      linkId,
      variants: [
        {
          clickCount: 4,
          destinationUrl: "https://example.com/a",
          id: "variant-1",
          weight: 60,
        },
        {
          clickCount: 6,
          destinationUrl: "https://example.com/b",
          id: "variant-2",
          weight: 40,
        },
      ],
    };

    const response = await GET(createRequest(), createContext());
    const body = await readJson<{
      linkId: string;
      splitTest: { performance: { totalVariantClicks: number } } | null;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      linkId,
      splitTest: {
        id: "split-test-1",
        performance: { totalVariantClicks: 10 },
      },
    });
  });

  it("should delete split test for an owned link", async () => {
    mockState.splitTest = {
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "split-test-1",
      isActive: true,
      linkId,
      variants: [],
    };

    const response = await DELETE(createRequest("DELETE"), createContext());
    const body = await readJson<{ deleted: boolean; id: string | null }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ deleted: true, id: "split-test-1", linkId });
    expect(mockState.splitTest).toBeNull();
    expect(mockState.cacheDeletes).toEqual(["redirect:promo"]);
  });

  it("should reject split test access when link belongs to another user", async () => {
    mockState.links = [createLink({ userId: "user-2" })];

    const response = await GET(createRequest(), createContext());
    const body = await readJson<{ linkId: string }>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should reject invalid split test input and rate limited requests", async () => {
    const invalidResponse = await POST(
      createRequest("POST", {
        variants: [{ destinationUrl: "http://127.0.0.1/admin", weight: 0 }],
      }),
      createContext(),
    );
    const invalidBody = await readJson<{ id: string }>(invalidResponse);

    expect(invalidResponse.status).toBe(400);
    expect(invalidBody.success).toBe(false);

    mockState.rateLimitResult = { limited: true, retryAfter: 60 };
    const rateLimitedResponse = await GET(createRequest(), createContext());
    const rateLimitedBody = await readJson<{ id: string }>(rateLimitedResponse);

    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedBody.success).toBe(false);
  });
});
