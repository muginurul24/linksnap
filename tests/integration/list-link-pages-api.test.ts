import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListedLinkPage } from "../../src/lib/db/queries/links";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

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

type LinkPagesListResponse = {
  brandName: string;
  createdAt: string;
  ctaClicks: number;
  ctaText: string;
  hasCountdown: boolean;
  id: string;
  isActive: boolean;
  linkId: string;
  pageViews: number;
  showQrCode: boolean;
  slug: string;
  title: string;
  updatedAt: string;
};

const mockState = vi.hoisted(() => ({
  apiKeyAuth: null as { userId: string; userPlan: Extract<UserPlan, "PRO" | "BUSINESS"> } | null,
  capturedListInput: null as {
    cursor?: { createdAt: Date; id: string };
    limit: number;
    page: number;
    userId: string;
  } | null,
  pages: [] as ListedLinkPage[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  userPlan: "PRO" as UserPlan | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/auth/api-key", () => ({
  authenticateApiKeyRequest: async () => mockState.apiKeyAuth,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
  listLinkPagesByUserIdPaginated: async (input: {
    cursor?: { createdAt: Date; id: string };
    limit: number;
    page: number;
    userId: string;
  }) => {
    mockState.capturedListInput = input;
    return {
      items: mockState.pages,
      nextCursor: input.cursor ? "next-page-cursor" : null,
      total: mockState.pages.length,
    };
  },
}));

import { GET } from "../../src/app/api/v1/pages/route";
import { encodeCreatedAtCursor } from "../../src/lib/pagination/cursor";

function createGetRequest(path = "/api/v1/pages", headers?: HeadersInit): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, { headers });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

function createMockPage(overrides: Partial<ListedLinkPage> = {}): ListedLinkPage {
  return {
    brandName: "Brand",
    clickTrend: [
      { date: "2026-05-01", pageViews: 0 },
      { date: "2026-05-02", pageViews: 0 },
      { date: "2026-05-03", pageViews: 0 },
      { date: "2026-05-04", pageViews: 0 },
      { date: "2026-05-05", pageViews: 0 },
      { date: "2026-05-06", pageViews: 0 },
      { date: "2026-05-07", pageViews: 0 },
    ],
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    ctaClickThroughRate: 0.1417,
    ctaClicks: 17,
    ctaText: "Shop now",
    hasCountdown: true,
    id: "page-1",
    isActive: true,
    linkId: "link-1",
    pageViews: 120,
    pageViewsLast7Days: 0,
    showQrCode: true,
    slug: "promo",
    title: "Promo page",
    updatedAt: new Date("2026-05-06T12:00:00.000Z"),
    ...overrides,
  };
}

describe("list Link Pages API", () => {
  beforeEach(() => {
    mockState.apiKeyAuth = null;
    mockState.capturedListInput = null;
    mockState.pages = [createMockPage()];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should list authenticated user's Link Pages", async () => {
    const response = await GET(createGetRequest());
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toEqual([
      {
        brandName: "Brand",
        createdAt: "2026-05-06T10:00:00.000Z",
        ctaClicks: 17,
        ctaText: "Shop now",
        hasCountdown: true,
        id: "page-1",
        isActive: true,
        linkId: "link-1",
        pageViews: 120,
        showQrCode: true,
        slug: "promo",
        title: "Promo page",
        updatedAt: "2026-05-06T12:00:00.000Z",
      },
    ]);
    expect(body.meta).toEqual({ page: 1, limit: 20, total: 1 });
    expect(mockState.capturedListInput).toEqual({
      limit: 20,
      page: 1,
      userId: "user-1",
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:pages:list:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should list Link Pages with API key auth", async () => {
    mockState.apiKeyAuth = {
      userId: "user-api",
      userPlan: "BUSINESS",
    };
    mockState.session = null;

    const response = await GET(
      createGetRequest("/api/v1/pages", { authorization: "Bearer lsnap_sk_test" }),
    );
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.capturedListInput).toMatchObject({ userId: "user-api" });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:pages:list:user-api", limit: 120, windowSeconds: 60 },
    ]);
  });

  it("should list Link Pages with cursor pagination metadata", async () => {
    const cursor = encodeCreatedAtCursor({
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
    });

    const response = await GET(createGetRequest(`/api/v1/pages?cursor=${cursor}&limit=5`));
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.meta).toEqual({
      limit: 5,
      nextCursor: "next-page-cursor",
      total: 1,
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

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createGetRequest());
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.capturedListInput).toBeNull();
  });

  it("should reject requests when the API rate limit is exceeded", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createGetRequest());
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.capturedListInput).toBeNull();
  });
});
