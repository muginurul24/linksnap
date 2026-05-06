import type { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockLink = {
  destinationUrl: string;
  id: string;
  slug: string;
  title?: string;
  userId: string;
};

type CreateLinkRecordInput = {
  destinationUrl: string;
  slug: string;
  title?: string;
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
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type CreateLinkResponse = {
  destinationUrl: string;
  id: string;
  shortUrl: string;
  slug: string;
};

const mockState = vi.hoisted(() => ({
  linkCount: 0,
  links: [] as MockLink[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  userPlan: "FREE" as UserPlan | null,
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
  countLinksByUserId: async () => mockState.linkCount,
  createLinkRecord: async (values: CreateLinkRecordInput) => {
    if (mockState.links.some((link) => link.slug === values.slug)) {
      throw Object.assign(new Error("duplicate slug"), { code: "23505" });
    }

    const link = {
      destinationUrl: values.destinationUrl,
      id: `link-${mockState.links.length + 1}`,
      slug: values.slug,
      title: values.title,
      userId: values.userId,
    };
    mockState.links.push(link);

    return {
      destinationUrl: link.destinationUrl,
      id: link.id,
      slug: link.slug,
    };
  },
  findLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => mockState.userPlan,
  isUniqueConstraintViolation: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505",
}));

import { POST } from "../../src/app/api/v1/links/route";

const previousBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

function createJsonRequest(body: unknown): NextRequest {
  return new Request("http://localhost:3000/api/v1/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("create link API", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test/";
    mockState.linkCount = 0;
    mockState.links.length = 0;
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "FREE";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl;
  });

  it("should create a link with a generated slug when authenticated", async () => {
    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com/path",
        title: "Promo",
      }),
    );

    expect(response.status).toBe(201);
    const body = await readJson<CreateLinkResponse>(response);

    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.destinationUrl).toBe("https://example.com/path");
    expect(body.data.id).toBe("link-1");
    expect(body.data.slug).toMatch(/^[a-z0-9]{7}$/);
    expect(body.data.shortUrl).toBe(`https://linksnap.test/${body.data.slug}`);
    expect(mockState.links[0]).toMatchObject({
      destinationUrl: "https://example.com/path",
      title: "Promo",
      userId: "user-1",
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "links:create:user-1", limit: 10, windowSeconds: 60 },
    ]);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await POST(
      createJsonRequest({ destinationUrl: "https://example.com" }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.links).toEqual([]);
  });

  it("should reject unsafe destination URLs", async () => {
    const response = await POST(
      createJsonRequest({ destinationUrl: "http://127.0.0.1/admin" }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject duplicate custom slugs", async () => {
    mockState.userPlan = "PRO";
    mockState.links.push({
      destinationUrl: "https://existing.example",
      id: "existing-link",
      slug: "taken",
      userId: "user-2",
    });

    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com",
        slug: "taken",
      }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("SLUG_ALREADY_EXISTS");
  });

  it("should reject custom slugs for free users", async () => {
    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com",
        slug: "custom-slug",
      }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PLAN_UPGRADE_REQUIRED");
  });

  it("should reject link creation when the user has reached the plan quota", async () => {
    mockState.linkCount = 25;

    const response = await POST(
      createJsonRequest({ destinationUrl: "https://example.com" }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("LINK_QUOTA_EXCEEDED");
  });

  it("should reject requests when the link creation rate limit is exceeded", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await POST(
      createJsonRequest({ destinationUrl: "https://example.com" }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
