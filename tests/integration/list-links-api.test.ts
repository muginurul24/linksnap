import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockListedLink = {
  campaignId: string | null;
  clickCount: number;
  createdAt: Date;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  slug: string;
  title: string | null;
  updatedAt: Date;
};

type ListLinksInput = {
  campaignId?: string;
  cursor?: { createdAt: Date; id: string };
  limit: number;
  page: number;
  search?: string;
  userId: string;
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
  | { data: T; meta?: Record<string, unknown>; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type ListLinkResponse = {
  campaignId: string | null;
  clickCount: number;
  createdAt: string;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  shortUrl: string;
  slug: string;
  title: string | null;
  updatedAt: string;
};

const mockState = vi.hoisted(() => ({
  capturedListInput: null as ListLinksInput | null,
  freshClickCounts: new Map<string, number>(),
  links: [] as MockListedLink[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  total: 0,
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

vi.mock("@/lib/db/queries/links", () => ({
  countLinksByUserId: async () => 0,
  createLinkRecord: async () => {
    throw new Error("createLinkRecord should not be called by list API tests");
  },
  findLinkBySlug: async () => null,
  getUserPlanById: async () => mockState.userPlan,
  isUniqueConstraintViolation: () => false,
  listLinksByUserId: async (input: ListLinksInput) => {
    mockState.capturedListInput = input;
    return {
      items: mockState.links,
      nextCursor: input.cursor ? "next-link-cursor" : null,
      total: mockState.total,
    };
  },
}));

vi.mock("@/lib/links/click-count-cache", () => ({
  hydrateRedirectClickCounts: async <T extends { clickCount: number; id: string }>(
    links: T[],
  ) =>
    links.map((link) => ({
      ...link,
      clickCount: mockState.freshClickCounts.get(link.id) ?? link.clickCount,
    })),
}));

import { GET } from "../../src/app/api/v1/links/route";
import { encodeCreatedAtCursor } from "../../src/lib/pagination/cursor";

const previousBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

function createGetRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

function createMockLink(overrides: Partial<MockListedLink> = {}): MockListedLink {
  return {
    campaignId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
    clickCount: 42,
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    destinationUrl: "https://example.com/promo",
    hasLinkPage: true,
    id: "link-1",
    isActive: true,
    slug: "promo",
    title: "Promo",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    ...overrides,
  };
}

describe("list links API", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test/";
    mockState.capturedListInput = null;
    mockState.freshClickCounts = new Map();
    mockState.links = [createMockLink()];
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.total = 12;
    mockState.userPlan = "PRO";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl;
  });

  it("should list authenticated user links with pagination metadata", async () => {
    const response = await GET(
      createGetRequest(
        "/api/v1/links?page=2&limit=5&search=promo&campaignId=f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      ),
    );
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.meta).toEqual({ page: 2, limit: 5, total: 12 });
    expect(body.data).toEqual([
      {
        campaignId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
        clickCount: 42,
        createdAt: "2026-05-06T10:00:00.000Z",
        destinationUrl: "https://example.com/promo",
        hasLinkPage: true,
        id: "link-1",
        isActive: true,
        shortUrl: "https://linksnap.test/promo",
        slug: "promo",
        title: "Promo",
        updatedAt: "2026-05-06T11:00:00.000Z",
      },
    ]);
    expect(mockState.capturedListInput).toEqual({
      campaignId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      limit: 5,
      page: 2,
      search: "promo",
      userId: "user-1",
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:list:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should use default pagination when query params are omitted", async () => {
    const response = await GET(createGetRequest("/api/v1/links"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 12 });
    expect(mockState.capturedListInput).toMatchObject({
      limit: 20,
      page: 1,
      userId: "user-1",
    });
  });

  it("should list authenticated user links with cursor pagination metadata", async () => {
    const cursor = encodeCreatedAtCursor({
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
    });

    const response = await GET(createGetRequest(`/api/v1/links?cursor=${cursor}&limit=5`));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.meta).toEqual({
      limit: 5,
      nextCursor: "next-link-cursor",
      total: 12,
    });
    expect(mockState.capturedListInput).toMatchObject({
      cursor: {
        createdAt: new Date("2026-05-06T10:00:00.000Z"),
        id: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      },
      limit: 5,
      page: 1,
      userId: "user-1",
    });
  });

  it("should return fresh click counts from the click count cache", async () => {
    mockState.freshClickCounts.set("link-1", 57);

    const response = await GET(createGetRequest("/api/v1/links"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data[0]?.clickCount).toBe(57);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createGetRequest("/api/v1/links"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.capturedListInput).toBeNull();
  });

  it("should reject invalid query params", async () => {
    const response = await GET(createGetRequest("/api/v1/links?page=0&limit=101"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unknown query params", async () => {
    const response = await GET(createGetRequest("/api/v1/links?sort=clicks"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests when the API rate limit is exceeded", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createGetRequest("/api/v1/links"));
    const body = await readJson<ListLinkResponse[]>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.capturedListInput).toBeNull();
  });
});
