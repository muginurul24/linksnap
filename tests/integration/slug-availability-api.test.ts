import type { NextRequest } from "next/server";
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

type SlugAvailabilityResponse = {
  available: boolean;
  customSlugAllowed: boolean;
  slug: string;
};

const mockState = vi.hoisted(() => ({
  links: [] as MockLink[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
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

vi.mock("@/lib/db/queries/links", () => ({
  findLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => mockState.userPlan,
}));

import { GET } from "../../src/app/api/v1/links/slug/[slug]/route";

function createRequest(): NextRequest {
  return new Request("http://localhost:3000/api/v1/links/slug/promo") as NextRequest;
}

function createContext(slug = "promo") {
  return { params: Promise.resolve({ slug }) };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("slug availability API", () => {
  beforeEach(() => {
    mockState.links = [];
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should return available when no link uses the slug", async () => {
    const response = await GET(createRequest(), createContext("promo"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toEqual({
      available: true,
      customSlugAllowed: true,
      slug: "promo",
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:slug:get:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should return unavailable when a link already uses the slug", async () => {
    mockState.links = [{ id: "link-1", slug: "promo" }];

    const response = await GET(createRequest(), createContext("promo"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.available).toBe(false);
  });

  it("should report custom slug plan access", async () => {
    mockState.userPlan = "FREE";

    const response = await GET(createRequest(), createContext("promo"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.customSlugAllowed).toBe(false);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest(), createContext("promo"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject invalid slug params", async () => {
    const response = await GET(createRequest(), createContext("Promo_123"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests when the rate limit is exceeded", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 30 };

    const response = await GET(createRequest(), createContext("promo"));
    const body = await readJson<SlugAvailabilityResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
