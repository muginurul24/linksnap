import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClickEventForAnalytics } from "../../src/lib/db/queries/click-events";

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

type ListClickEventsForLinkInput = {
  from: Date;
  linkId: string;
  to: Date;
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

type LinkAnalyticsResponse = {
  browserBreakdown: { count: number; label: string }[];
  clicksPerDay: { date: string; totalClicks: number }[];
  deviceBreakdown: { count: number; label: string }[];
  linkId: string;
  range: {
    from: string;
    to: string;
  };
  topCities: { count: number; label: string }[];
  topCountries: { count: number; label: string }[];
  topReferrers: { count: number; label: string }[];
  totalClicks: number;
  uniqueClicks: number;
};

const mockState = vi.hoisted(() => ({
  capturedClickInput: null as ListClickEventsForLinkInput | null,
  clickEvents: [] as ClickEventForAnalytics[],
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
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  listClickEventsForLink: async (input: ListClickEventsForLinkInput) => {
    mockState.capturedClickInput = input;
    return mockState.clickEvents.filter(
      (event) => event.timestamp >= input.from && event.timestamp <= input.to,
    );
  },
}));

import { GET } from "../../src/app/api/v1/links/[id]/analytics/route";

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";

function createRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}/analytics${query}`);
}

function createContext(id = linkId) {
  return { params: Promise.resolve({ id }) };
}

function createMockLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    campaignId: null,
    clickCount: 3,
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

function createClickEvent(
  overrides: Partial<ClickEventForAnalytics> = {},
): ClickEventForAnalytics {
  return {
    browser: "Chrome",
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    ipHash: "hash-1",
    referrer: "https://referrer.example",
    timestamp: new Date("2026-05-06T10:00:00.000Z"),
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("link analytics API", () => {
  beforeEach(() => {
    mockState.capturedClickInput = null;
    mockState.clickEvents = [
      createClickEvent(),
      createClickEvent({
        browser: "Safari",
        device: "mobile",
        ipHash: "hash-2",
        referrer: null,
        timestamp: new Date("2026-05-06T11:00:00.000Z"),
      }),
      createClickEvent({
        timestamp: new Date("2026-05-05T09:00:00.000Z"),
      }),
    ];
    mockState.links = [createMockLink()];
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should return owner-scoped analytics for a valid date range", async () => {
    const response = await GET(
      createRequest("?from=2026-05-05T00:00:00.000Z&to=2026-05-06T23:59:59.000Z"),
      createContext(),
    );
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      browserBreakdown: [
        { count: 2, label: "Chrome" },
        { count: 1, label: "Safari" },
      ],
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 2 },
      ],
      deviceBreakdown: [
        { count: 2, label: "desktop" },
        { count: 1, label: "mobile" },
      ],
      linkId,
      topReferrers: [
        { count: 2, label: "https://referrer.example" },
        { count: 1, label: "Direct" },
      ],
      totalClicks: 3,
      uniqueClicks: 2,
    });
    expect(mockState.capturedClickInput).toEqual({
      from: new Date("2026-05-05T00:00:00.000Z"),
      linkId,
      to: new Date("2026-05-06T23:59:59.000Z"),
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:analytics:get:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should reject direct object reference access for another user's link", async () => {
    mockState.links = [createMockLink({ userId: "user-2" })];

    const response = await GET(createRequest(), createContext());
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
    expect(mockState.capturedClickInput).toBeNull();
  });

  it("should reject analytics ranges longer than 30 days", async () => {
    const response = await GET(
      createRequest("?from=2026-04-01T00:00:00.000Z&to=2026-05-06T00:00:00.000Z"),
      createContext(),
    );
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unknown query params", async () => {
    const response = await GET(createRequest("?range=all"), createContext());
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest(), createContext());
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject rate limited requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest(), createContext());
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("should reject invalid link IDs", async () => {
    const response = await GET(createRequest(), createContext("not-a-uuid"));
    const body = await readJson<LinkAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});
