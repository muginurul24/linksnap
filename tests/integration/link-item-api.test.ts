import { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

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

type UpdateLinkRecordInput = {
  destinationUrl?: string;
  id: string;
  slug?: string;
  title?: string | null;
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

type LinkDetailResponse = {
  campaignId: string | null;
  clickCount: number;
  clickSummary: {
    totalClicks: number;
  };
  createdAt: string;
  destinationUrl: string;
  expiresAt: string | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: string | null;
  shortUrl: string;
  slug: string;
  title: string | null;
  updatedAt: string;
};

type DeleteLinkResponse = {
  deleted: boolean;
  id: string;
};

const mockState = vi.hoisted(() => ({
  cacheDeleteKeys: [] as string[],
  freshClickCounts: new Map<string, number>(),
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

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    mockState.cacheDeleteKeys.push(key);
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  findLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => mockState.userPlan,
  isUniqueConstraintViolation: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505",
  softDeleteLinkForUser: async (id: string, userId: string) => {
    const link = mockState.links.find((item) => item.id === id && item.userId === userId);
    if (!link) return null;

    link.isActive = false;
    link.updatedAt = new Date("2026-05-06T12:00:00.000Z");
    return { id: link.id };
  },
  updateLinkRecordForUser: async (input: UpdateLinkRecordInput) => {
    const link = mockState.links.find(
      (item) => item.id === input.id && item.userId === input.userId,
    );
    if (!link) return null;

    if (
      input.slug &&
      mockState.links.some((item) => item.id !== input.id && item.slug === input.slug)
    ) {
      throw Object.assign(new Error("duplicate slug"), { code: "23505" });
    }

    if (input.destinationUrl !== undefined) link.destinationUrl = input.destinationUrl;
    if (input.slug !== undefined) link.slug = input.slug;
    if (input.title !== undefined) link.title = input.title;
    link.updatedAt = new Date("2026-05-06T12:00:00.000Z");

    return link;
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

import {
  DELETE,
  GET,
  PATCH,
} from "../../src/app/api/v1/links/[id]/route";

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const otherLinkId = "7c4a7a24-7348-4a94-81c6-b837364cf605";
const previousBaseUrl = process.env.NEXT_PUBLIC_APP_URL;

function createRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}`, {
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
    campaignId: null,
    clickCount: 42,
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    destinationUrl: "https://example.com/original",
    expiresAt: null,
    hasLinkPage: false,
    id: linkId,
    isActive: true,
    scheduledAt: null,
    slug: "original",
    title: "Original",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    userId: "user-1",
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("link item API", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test/";
    mockState.freshClickCounts = new Map();
    mockState.links = [createMockLink()];
    mockState.cacheDeleteKeys = [];
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl;
  });

  it("should return link details with click summary for the owner", async () => {
    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      clickCount: 42,
      clickSummary: { totalClicks: 42 },
      destinationUrl: "https://example.com/original",
      id: linkId,
      shortUrl: "https://linksnap.test/original",
      slug: "original",
      title: "Original",
    });
    expect("userId" in body.data).toBe(false);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:item:get:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should return fresh click count details from the click count cache", async () => {
    mockState.freshClickCounts.set(linkId, 73);

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.clickCount).toBe(73);
    expect(body.data.clickSummary.totalClicks).toBe(73);
  });

  it("should reject direct object reference access for another user's link", async () => {
    mockState.links = [createMockLink({ userId: "user-2" })];

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should update destination title and slug for a pro user", async () => {
    const response = await PATCH(
      createRequest("PATCH", {
        destinationUrl: " https://example.com/updated ",
        slug: "updated",
        title: "",
      }),
      createContext(),
    );
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      destinationUrl: "https://example.com/updated",
      shortUrl: "https://linksnap.test/updated",
      slug: "updated",
      title: null,
    });
    expect(mockState.links[0]).toMatchObject({
      destinationUrl: "https://example.com/updated",
      slug: "updated",
      title: null,
    });
    expect(mockState.cacheDeleteKeys).toEqual([
      "redirect:original",
      "redirect:updated",
    ]);
  });

  it("should reject duplicate slug updates", async () => {
    mockState.links.push(
      createMockLink({
        id: otherLinkId,
        slug: "taken",
        userId: "user-2",
      }),
    );

    const response = await PATCH(
      createRequest("PATCH", { slug: "taken" }),
      createContext(),
    );
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("SLUG_ALREADY_EXISTS");
  });

  it("should reject slug updates for free users", async () => {
    mockState.userPlan = "FREE";

    const response = await PATCH(
      createRequest("PATCH", { slug: "free-change" }),
      createContext(),
    );
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("PLAN_UPGRADE_REQUIRED");
  });

  it("should reject unsafe destination updates", async () => {
    const response = await PATCH(
      createRequest("PATCH", { destinationUrl: "http://127.0.0.1/admin" }),
      createContext(),
    );
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject empty update bodies", async () => {
    const response = await PATCH(createRequest("PATCH", {}), createContext());
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should soft delete owned links", async () => {
    const response = await DELETE(createRequest("DELETE"), createContext());
    const body = await readJson<DeleteLinkResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ deleted: true, id: linkId });
    expect(mockState.links[0]?.isActive).toBe(false);
    expect(mockState.cacheDeleteKeys).toEqual(["redirect:original"]);
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject invalid link IDs", async () => {
    const response = await GET(createRequest("GET"), createContext("not-a-uuid"));
    const body = await readJson<LinkDetailResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
