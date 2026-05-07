import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkAnalyticsSummary } from "../../src/lib/analytics/summary";
import type {
  CampaignClickEventForAnalytics,
  TopCampaignLink,
} from "../../src/lib/db/queries/click-events";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockCampaign = {
  createdAt: Date;
  description: string | null;
  id: string;
  linkCount: number;
  name: string;
  slug: string;
  updatedAt: Date;
  userId: string;
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  utmSource: string | null;
  utmTerm: string | null;
};

type ListCampaignEventsInput = {
  campaignIds: string[];
  from: Date;
  to: Date;
};

type ListTopLinksInput = {
  campaignId: string;
  from: Date;
  limit?: number;
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

type CampaignAnalyticsResponse = LinkAnalyticsSummary & {
  campaign: {
    id: string;
    linkCount: number;
    name: string;
    slug: string;
  };
  comparisons: Array<
    LinkAnalyticsSummary & {
      id: string;
      linkCount: number;
      name: string;
      slug: string;
    }
  >;
  range: {
    from: string;
    to: string;
  };
  topLinks: TopCampaignLink[];
};

const campaignId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const compareCampaignId = "597c9f2a-6206-409e-a116-5d02bba5f7a4";
const linkId = "7c4a7a24-7348-4a94-81c6-b837364cf605";

const mockState = vi.hoisted(() => ({
  campaigns: [] as MockCampaign[],
  capturedCampaignEventsInput: null as ListCampaignEventsInput | null,
  capturedTopLinksInput: null as ListTopLinksInput | null,
  clickEvents: [] as CampaignClickEventForAnalytics[],
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  topLinks: [] as TopCampaignLink[],
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
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/campaigns", () => ({
  findCampaignById: async (id: string) =>
    mockState.campaigns.find((campaign) => campaign.id === id) ?? null,
  findCampaignsBySlugsForUser: async ({
    slugs,
    userId,
  }: {
    slugs: string[];
    userId: string;
  }) =>
    mockState.campaigns.filter(
      (campaign) => campaign.userId === userId && slugs.includes(campaign.slug),
    ),
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  listClickEventsForCampaigns: async (input: ListCampaignEventsInput) => {
    mockState.capturedCampaignEventsInput = input;
    return mockState.clickEvents.filter(
      (event) =>
        input.campaignIds.includes(event.campaignId) &&
        event.timestamp >= input.from &&
        event.timestamp <= input.to,
    );
  },
  listTopLinksForCampaign: async (input: ListTopLinksInput) => {
    mockState.capturedTopLinksInput = input;
    return mockState.topLinks;
  },
}));

import { GET } from "../../src/app/api/v1/campaigns/[id]/analytics/route";

function createRequest(query = ""): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/v1/campaigns/${campaignId}/analytics${query}`,
  );
}

function createContext(id = campaignId) {
  return { params: Promise.resolve({ id }) };
}

function createCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  return {
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    description: "Ramadhan campaign",
    id: campaignId,
    linkCount: 2,
    name: "Ramadhan Sale",
    slug: "ramadhan-sale",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    userId: "user-1",
    utmCampaign: "ramadhan-2026",
    utmContent: null,
    utmMedium: "social",
    utmSource: "instagram",
    utmTerm: null,
    ...overrides,
  };
}

function createClickEvent(
  overrides: Partial<CampaignClickEventForAnalytics> = {},
): CampaignClickEventForAnalytics {
  return {
    browser: "Chrome",
    campaignId,
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

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("campaign analytics API", () => {
  beforeEach(() => {
    mockState.campaigns = [
      createCampaign(),
      createCampaign({
        id: compareCampaignId,
        linkCount: 1,
        name: "Launch Q2",
        slug: "launch-q2-2026",
      }),
    ];
    mockState.capturedCampaignEventsInput = null;
    mockState.capturedTopLinksInput = null;
    mockState.clickEvents = [
      createClickEvent(),
      createClickEvent({
        browser: "Safari",
        device: "mobile",
        ipHash: "hash-2",
        referrer: null,
        timestamp: new Date("2026-05-05T09:00:00.000Z"),
      }),
      createClickEvent({
        campaignId: compareCampaignId,
        country: "SG",
        ipHash: "hash-3",
      }),
    ];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.topLinks = [
      {
        destinationUrl: "https://example.com/promo",
        id: linkId,
        slug: "promo",
        title: "Promo",
        totalClicks: 2,
      },
    ];
    mockState.userPlan = "PRO";
  });

  it("should return aggregated analytics when campaign is owned", async () => {
    const response = await GET(
      createRequest(
        "?from=2026-05-05T00:00:00.000Z&to=2026-05-06T23:59:59.000Z&compare=launch-q2-2026",
      ),
      createContext(),
    );
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toMatchObject({
      campaign: {
        id: campaignId,
        linkCount: 2,
        name: "Ramadhan Sale",
        slug: "ramadhan-sale",
      },
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 1 },
      ],
      topCountries: [{ count: 2, label: "ID" }],
      topLinks: [
        {
          id: linkId,
          slug: "promo",
          title: "Promo",
          totalClicks: 2,
        },
      ],
      totalClicks: 2,
      uniqueClicks: 2,
    });
    expect(body.data.comparisons).toHaveLength(1);
    expect(body.data.comparisons[0]).toMatchObject({
      id: compareCampaignId,
      name: "Launch Q2",
      slug: "launch-q2-2026",
      topCountries: [{ count: 1, label: "SG" }],
      totalClicks: 1,
      uniqueClicks: 1,
    });
    expect(mockState.capturedCampaignEventsInput).toEqual({
      campaignIds: [campaignId, compareCampaignId],
      from: new Date("2026-05-05T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.000Z"),
    });
    expect(mockState.capturedTopLinksInput).toEqual({
      campaignId,
      from: new Date("2026-05-05T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.000Z"),
    });
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:campaigns:analytics:get:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should reject access when campaign belongs to another user", async () => {
    mockState.campaigns = [createCampaign({ userId: "user-2" })];

    const response = await GET(createRequest(), createContext());
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
    expect(mockState.capturedCampaignEventsInput).toBeNull();
  });

  it("should reject compare campaigns when slug is not owned", async () => {
    const response = await GET(
      createRequest("?compare=missing-campaign"),
      createContext(),
    );
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("CAMPAIGN_COMPARISON_NOT_FOUND");
  });

  it("should reject invalid analytics query when range is too long", async () => {
    const response = await GET(
      createRequest("?from=2026-04-01T00:00:00.000Z&to=2026-05-06T00:00:00.000Z"),
      createContext(),
    );
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject invalid analytics query when compare slug is invalid", async () => {
    const response = await GET(createRequest("?compare=Bad%20Slug"), createContext());
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject unauthenticated requests when session is missing", async () => {
    mockState.session = null;

    const response = await GET(createRequest(), createContext());
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject requests when rate limited", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest(), createContext());
    const body = await readJson<CampaignAnalyticsResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
