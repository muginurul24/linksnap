import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type UserPlan = "FREE" | "PRO" | "BUSINESS";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockCampaign = {
  id: string;
  linkCount: number;
  userId: string;
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  utmSource: string | null;
  utmTerm: string | null;
};

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
  userId: string;
};

type ListLinksInput = {
  campaignId?: string;
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

const campaignId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const linkId = "7c4a7a24-7348-4a94-81c6-b837364cf605";
const secondLinkId = "94f36524-a36b-4ad8-86fa-8f6b975f130d";

const mockState = vi.hoisted(() => ({
  campaigns: [] as MockCampaign[],
  capturedListInput: null as ListLinksInput | null,
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

vi.mock("@/lib/db/queries/campaigns", () => ({
  findCampaignById: async (id: string) =>
    mockState.campaigns.find((campaign) => campaign.id === id) ?? null,
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
  listLinksByUserId: async (input: ListLinksInput) => {
    mockState.capturedListInput = input;
    return {
      items: mockState.links.filter(
        (link) =>
          link.userId === input.userId &&
          (!input.campaignId || link.campaignId === input.campaignId),
      ),
      total: mockState.total,
    };
  },
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
  removeLinkFromCampaignForUser: async ({
    campaignId,
    linkId,
    userId,
  }: {
    campaignId: string;
    linkId: string;
    userId: string;
  }) => {
    const link = mockState.links.find(
      (item) =>
        item.id === linkId && item.userId === userId && item.campaignId === campaignId,
    );
    if (!link) return null;

    link.campaignId = null;
    return { id: link.id };
  },
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

import {
  DELETE,
  GET,
  POST,
} from "../../src/app/api/v1/campaigns/[id]/links/route";

function createRequest(path: string, method = "GET", body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function createContext(id = campaignId) {
  return { params: Promise.resolve({ id }) };
}

function createCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  return {
    id: campaignId,
    linkCount: 1,
    userId: "user-1",
    utmCampaign: "ramadhan-2026",
    utmContent: null,
    utmMedium: "social",
    utmSource: "instagram",
    utmTerm: null,
    ...overrides,
  };
}

function createLink(overrides: Partial<MockListedLink> = {}): MockListedLink {
  return {
    campaignId,
    clickCount: 12,
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

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("campaign links API", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test/";
    mockState.campaigns = [createCampaign()];
    mockState.capturedListInput = null;
    mockState.links = [createLink(), createLink({ id: secondLinkId, slug: "two" })];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.total = 2;
    mockState.userPlan = "PRO";
  });

  it("should list links assigned to an owned campaign", async () => {
    const response = await GET(
      createRequest(`/api/v1/campaigns/${campaignId}/links?page=2&limit=5`),
      createContext(),
    );
    const body = await readJson<Array<{ id: string; shortUrl: string }>>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.meta).toEqual({ page: 2, limit: 5, total: 2 });
    expect(body.data[0]).toMatchObject({
      id: linkId,
      shortUrl: "https://linksnap.test/promo",
    });
    expect(mockState.capturedListInput).toEqual({
      campaignId,
      limit: 5,
      page: 2,
      userId: "user-1",
    });
  });

  it("should add owned links to a campaign with UTM params", async () => {
    mockState.links = [
      createLink({ campaignId: null }),
      createLink({ campaignId: null, id: secondLinkId, slug: "two" }),
    ];

    const response = await POST(
      createRequest(`/api/v1/campaigns/${campaignId}/links`, "POST", {
        linkIds: [linkId, secondLinkId],
      }),
      createContext(),
    );
    const body = await readJson<{
      campaignId: string;
      linkIds: string[];
      links: Array<{
        id: string;
        previewUrl: string;
        utmApplied: boolean;
      }>;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      campaignId,
      linkIds: [linkId, secondLinkId],
      links: [
        {
          id: linkId,
          previewUrl:
            "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
          utmApplied: true,
        },
        {
          id: secondLinkId,
          previewUrl:
            "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
          utmApplied: true,
        },
      ],
    });
    expect(mockState.links.map((link) => link.campaignId)).toEqual([
      campaignId,
      campaignId,
    ]);
    expect(mockState.links.map((link) => link.destinationUrl)).toEqual([
      "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
      "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
    ]);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:campaigns:links:post:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should preview campaign UTM params before saving links", async () => {
    mockState.links = [createLink({ campaignId: null })];

    const response = await POST(
      createRequest(`/api/v1/campaigns/${campaignId}/links`, "POST", {
        linkIds: [linkId],
        preview: true,
      }),
      createContext(),
    );
    const body = await readJson<{
      campaignId: string;
      links: Array<{ id: string; previewUrl: string; utmApplied: boolean }>;
      preview: boolean;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({
      campaignId,
      links: [
        {
          destinationUrl: "https://example.com/promo",
          id: linkId,
          previewUrl:
            "https://example.com/promo?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
          utmApplied: true,
        },
      ],
      preview: true,
    });
    expect(mockState.links[0]).toMatchObject({
      campaignId: null,
      destinationUrl: "https://example.com/promo",
    });
  });

  it("should remove a link from a campaign", async () => {
    const response = await DELETE(
      createRequest(`/api/v1/campaigns/${campaignId}/links`, "DELETE", {
        linkId,
      }),
      createContext(),
    );
    const body = await readJson<{
      campaignId: string;
      linkId: string;
      removed: boolean;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ campaignId, linkId, removed: true });
    expect(mockState.links[0]?.campaignId).toBeNull();
  });

  it("should reject adding links not owned by the user", async () => {
    mockState.links = [createLink({ userId: "user-2" })];

    const response = await POST(
      createRequest(`/api/v1/campaigns/${campaignId}/links`, "POST", {
        linkIds: [linkId],
      }),
      createContext(),
    );
    const body = await readJson<{ campaignId: string; linkIds: string[] }>(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("LINK_NOT_FOUND");
  });

  it("should reject campaign access for another owner", async () => {
    mockState.campaigns = [createCampaign({ userId: "user-2" })];

    const response = await GET(
      createRequest(`/api/v1/campaigns/${campaignId}/links`),
      createContext(),
    );
    const body = await readJson<Array<{ id: string }>>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should reject invalid input and rate limited requests", async () => {
    const invalidResponse = await POST(
      createRequest(`/api/v1/campaigns/${campaignId}/links`, "POST", {
        linkIds: [],
      }),
      createContext(),
    );
    const invalidBody = await readJson<{ campaignId: string }>(invalidResponse);
    expect(invalidResponse.status).toBe(400);
    expect(invalidBody.success).toBe(false);

    mockState.rateLimitResult = { limited: true, retryAfter: 60 };
    const rateLimitedResponse = await GET(
      createRequest(`/api/v1/campaigns/${campaignId}/links`),
      createContext(),
    );
    const rateLimitedBody = await readJson<Array<{ id: string }>>(
      rateLimitedResponse,
    );
    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedBody.success).toBe(false);
  });
});
