import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignClickEventForAnalytics } from "../../src/lib/db/queries/click-events";

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

type MockLink = {
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
  userId: string;
};

type MockCampaignClickEvent = CampaignClickEventForAnalytics & {
  linkId: string;
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

const campaignId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const linkId = "7c4a7a24-7348-4a94-81c6-b837364cf605";

const mockState = vi.hoisted(() => ({
  campaigns: [] as MockCampaign[],
  clickEvents: [] as MockCampaignClickEvent[],
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

vi.mock("@/lib/db/queries/campaigns", () => ({
  createCampaignRecord: async (input: {
    description?: string | null;
    name: string;
    slug: string;
    userId: string;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmMedium?: string | null;
    utmSource?: string | null;
    utmTerm?: string | null;
  }) => {
    const campaign = createCampaign({
      description: input.description ?? null,
      name: input.name,
      slug: input.slug,
      userId: input.userId,
      utmCampaign: input.utmCampaign ?? null,
      utmContent: input.utmContent ?? null,
      utmMedium: input.utmMedium ?? null,
      utmSource: input.utmSource ?? null,
      utmTerm: input.utmTerm ?? null,
    });
    mockState.campaigns.push(campaign);

    return campaign;
  },
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
  isUniqueCampaignConstraintViolation: () => false,
  listCampaignsByUserId: async () => ({
    items: mockState.campaigns,
    total: mockState.campaigns.length,
  }),
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
  listLinksByUserId: async () => ({
    items: mockState.links,
    total: mockState.links.length,
  }),
  listOwnedLinksByIds: async ({
    linkIds,
    userId,
  }: {
    linkIds: string[];
    userId: string;
  }) =>
    mockState.links
      .filter((link) => link.userId === userId && linkIds.includes(link.id))
      .map((link) => ({
        destinationUrl: link.destinationUrl,
        id: link.id,
      })),
  removeLinkFromCampaignForUser: async () => null,
  setLinksCampaignForUser: async ({
    campaignId,
    destinationUrlsById,
    linkIds,
    userId,
  }: {
    campaignId: string;
    destinationUrlsById?: ReadonlyMap<string, string>;
    linkIds: string[];
    userId: string;
  }) => {
    const updatedIds: string[] = [];
    for (const link of mockState.links) {
      if (link.userId === userId && linkIds.includes(link.id)) {
        link.campaignId = campaignId;
        link.destinationUrl = destinationUrlsById?.get(link.id) ?? link.destinationUrl;
        updatedIds.push(link.id);
      }
    }

    return updatedIds;
  },
}));

vi.mock("@/lib/db/queries/click-events", () => ({
  listClickEventsForCampaigns: async ({
    campaignIds,
    from,
    to,
  }: {
    campaignIds: string[];
    from: Date;
    to: Date;
  }) =>
    mockState.clickEvents.filter(
      (event) =>
        campaignIds.includes(event.campaignId) &&
        event.timestamp >= from &&
        event.timestamp <= to,
    ),
  listTopLinksForCampaign: async ({
    campaignId,
  }: {
    campaignId: string;
  }) =>
    mockState.links
      .filter((link) => link.campaignId === campaignId)
      .map((link) => ({
        destinationUrl: link.destinationUrl,
        id: link.id,
        slug: link.slug,
        title: link.title,
        totalClicks: mockState.clickEvents.filter(
          (event) =>
            event.linkId === link.id && event.eventType !== "LINK_PAGE_CTA_CLICK",
        ).length,
      }))
      .filter((link) => link.totalClicks > 0),
}));

import { GET as GETCampaignAnalytics } from "../../src/app/api/v1/campaigns/[id]/analytics/route";
import { POST as POSTCampaignLinks } from "../../src/app/api/v1/campaigns/[id]/links/route";
import { POST as POSTCampaign } from "../../src/app/api/v1/campaigns/route";

function createRequest(path: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    method,
  });
}

function createCampaignContext(id = campaignId) {
  return { params: Promise.resolve({ id }) };
}

function createCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  return {
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    description: null,
    id: campaignId,
    linkCount: 0,
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

function createLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    campaignId: null,
    clickCount: 0,
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    destinationUrl: "https://example.com/promo",
    hasLinkPage: false,
    id: linkId,
    isActive: true,
    slug: "promo",
    title: "Promo",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    userId: "user-1",
    ...overrides,
  };
}

function createClickEvent(
  overrides: Partial<MockCampaignClickEvent> = {},
): MockCampaignClickEvent {
  return {
    browser: "Chrome",
    campaignId,
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    eventType: "DIRECT_REDIRECT",
    ipHash: "hash-1",
    linkId,
    linkPageHasCountdown: false,
    referrer: null,
    timestamp: new Date("2026-05-06T12:00:00.000Z"),
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("campaign workflow", () => {
  beforeEach(() => {
    mockState.campaigns = [];
    mockState.clickEvents = [];
    mockState.links = [createLink()];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should create campaign then add links with UTM params and return analytics", async () => {
    const createCampaignResponse = await POSTCampaign(
      createRequest("/api/v1/campaigns", "POST", {
        name: "Ramadhan Sale",
        slug: "ramadhan-sale",
        utmCampaign: "ramadhan-2026",
        utmMedium: "social",
        utmSource: "instagram",
      }),
    );
    const campaignBody = await readJson<{ id: string }>(createCampaignResponse);

    expect(createCampaignResponse.status).toBe(201);
    expect(campaignBody.success).toBe(true);
    if (!campaignBody.success) return;

    const addLinksResponse = await POSTCampaignLinks(
      createRequest(`/api/v1/campaigns/${campaignBody.data.id}/links`, "POST", {
        linkIds: [linkId],
      }),
      createCampaignContext(campaignBody.data.id),
    );
    const addLinksBody = await readJson<{ linkIds: string[] }>(addLinksResponse);

    expect(addLinksResponse.status).toBe(200);
    expect(addLinksBody.success).toBe(true);
    expect(mockState.links[0]).toMatchObject({
      campaignId: campaignBody.data.id,
      destinationUrl:
        "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
    });

    mockState.clickEvents = [createClickEvent({ campaignId: campaignBody.data.id })];
    const analyticsResponse = await GETCampaignAnalytics(
      createRequest(
        `/api/v1/campaigns/${campaignBody.data.id}/analytics?from=2026-05-06T00:00:00.000Z&to=2026-05-06T23:59:59.000Z`,
      ),
      createCampaignContext(campaignBody.data.id),
    );
    const analyticsBody = await readJson<{
      topLinks: Array<{ id: string; totalClicks: number }>;
      totalClicks: number;
    }>(analyticsResponse);

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsBody.success).toBe(true);
    if (!analyticsBody.success) return;
    expect(analyticsBody.data.totalClicks).toBe(1);
    expect(analyticsBody.data.topLinks[0]).toMatchObject({
      id: linkId,
      totalClicks: 1,
    });
  });
});
