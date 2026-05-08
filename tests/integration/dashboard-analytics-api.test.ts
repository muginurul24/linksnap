import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ClickEventForAnalytics,
  DashboardAnalyticsAggregates,
} from "../../src/lib/db/queries/click-events";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type ListClickEventsForUserInput = {
  from: Date;
  to: Date;
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

type DashboardAnalyticsResponse = {
  range: {
    from: string;
    key: "7" | "30" | "90" | "custom";
    to: string;
  };
  summary: {
    clicksPerDay: { date: string; totalClicks: number }[];
    deviceBreakdown: { count: number; label: string }[];
    topCountries: { count: number; label: string }[];
    topReferrers: { count: number; label: string }[];
    totalClicks: number;
    uniqueClicks: number;
  };
};

const mockState = vi.hoisted(() => ({
  capturedInput: null as ListClickEventsForUserInput | null,
  aggregates: null as DashboardAnalyticsAggregates | null,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  userPlan: "PRO" as UserPlan | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  getDashboardAnalyticsAggregatesForUser: async (
    input: ListClickEventsForUserInput,
  ) => {
    mockState.capturedInput = input;
    return mockState.aggregates;
  },
}));

import { GET } from "../../src/app/api/v1/analytics/route";

function createRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/analytics${query}`);
}

function createClickEvent(
  overrides: Partial<ClickEventForAnalytics> = {},
): ClickEventForAnalytics {
  return {
    browser: "Chrome",
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    eventType: "DIRECT_REDIRECT",
    ipHash: "hash-1",
    linkPageHasCountdown: false,
    referrer: "https://referrer.example",
    timestamp: new Date("2026-05-06T10:00:00.000Z"),
    ...overrides,
  };
}

function buildMockAggregates(
  events: ClickEventForAnalytics[],
): DashboardAnalyticsAggregates {
  return {
    browserBreakdown: [{ count: 2, label: "Chrome" }],
    clicksPerDay: [
      { date: "2026-05-05", totalClicks: 1 },
      { date: "2026-05-06", totalClicks: 1 },
    ],
    deviceBreakdown: [
      { count: 1, label: "desktop" },
      { count: 1, label: "mobile" },
    ],
    summary: {
      countdownCtaClicks: 0,
      countdownViews: 0,
      ctaClicks: 0,
      directRedirects: 2,
      pageViews: 0,
      totalClicks: events.length,
      uniqueVisitors: new Set(events.map((event) => event.ipHash)).size,
      withoutCountdownCtaClicks: 0,
      withoutCountdownViews: 0,
    },
    topCities: [{ count: 2, label: "Jakarta" }],
    topCountries: [
      { count: 1, label: "ID" },
      { count: 1, label: "US" },
    ],
    topLinks: [
      {
        destinationUrl: "https://example.com",
        id: "link-1",
        slug: "promo",
        title: "Promo",
        totalClicks: 2,
      },
    ],
    topReferrers: [
      { count: 1, label: "Direct" },
      { count: 1, label: "https://referrer.example" },
    ],
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("dashboard analytics API", () => {
  beforeEach(() => {
    mockState.capturedInput = null;
    mockState.aggregates = buildMockAggregates([
      createClickEvent(),
      createClickEvent({
        country: "US",
        device: "mobile",
        ipHash: "hash-2",
        referrer: null,
        timestamp: new Date("2026-05-05T10:00:00.000Z"),
      }),
    ]);
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should return owner-scoped dashboard analytics", async () => {
    const response = await GET(
      createRequest("?range=custom&from=2026-05-05&to=2026-05-06"),
    );
    const body = await readJson<DashboardAnalyticsResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.range).toMatchObject({
      from: "2026-05-05T00:00:00.000Z",
      key: "custom",
      to: "2026-05-06T23:59:59.999Z",
    });
    expect(body.data.summary).toMatchObject({
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 1 },
      ],
      deviceBreakdown: [
        { count: 1, label: "desktop" },
        { count: 1, label: "mobile" },
      ],
      totalClicks: 2,
      uniqueClicks: 2,
    });
    expect(mockState.capturedInput).toEqual({
      from: new Date("2026-05-05T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.999Z"),
      userId: "user-1",
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:analytics:get:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should reject invalid analytics query ranges", async () => {
    const response = await GET(
      createRequest("?range=custom&from=2026-01-01&to=2026-05-06"),
    );
    const body = await readJson<DashboardAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockState.capturedInput).toBeNull();
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest());
    const body = await readJson<DashboardAnalyticsResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject requests when rate limited", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest());
    const body = await readJson<DashboardAnalyticsResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
