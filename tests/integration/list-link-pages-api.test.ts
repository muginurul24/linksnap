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
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type LinkPagesListResponse = {
  brandName: string;
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
  capturedUserId: null as string | null,
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
  listLinkPagesByUserId: async (userId: string) => {
    mockState.capturedUserId = userId;
    return mockState.pages;
  },
}));

import { GET } from "../../src/app/api/v1/pages/route";

function createGetRequest(headers?: HeadersInit): NextRequest {
  return new NextRequest("http://localhost:3000/api/v1/pages", { headers });
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

function createMockPage(overrides: Partial<ListedLinkPage> = {}): ListedLinkPage {
  return {
    brandName: "Brand",
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
    updatedAt: new Date("2026-05-06T12:00:00.000Z"),
    ...overrides,
  };
}

describe("list Link Pages API", () => {
  beforeEach(() => {
    mockState.apiKeyAuth = null;
    mockState.capturedUserId = null;
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
    expect(mockState.capturedUserId).toBe("user-1");
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
      createGetRequest({ authorization: "Bearer lsnap_sk_test" }),
    );
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.capturedUserId).toBe("user-api");
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:pages:list:user-api", limit: 120, windowSeconds: 60 },
    ]);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createGetRequest());
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.capturedUserId).toBeNull();
  });

  it("should reject requests when the API rate limit is exceeded", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createGetRequest());
    const body = await readJson<LinkPagesListResponse[]>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.capturedUserId).toBeNull();
  });
});
