import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

type CreateCampaignRecordInput = Omit<
  MockCampaign,
  "createdAt" | "id" | "linkCount" | "updatedAt"
>;

type UpdateCampaignRecordInput = Partial<
  Omit<MockCampaign, "createdAt" | "id" | "linkCount" | "updatedAt" | "userId">
> & {
  id: string;
  userId: string;
};

type ListCampaignsInput = {
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

type CampaignResponse = Omit<MockCampaign, "userId">;

const campaignId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const otherCampaignId = "7c4a7a24-7348-4a94-81c6-b837364cf605";

const mockState = vi.hoisted(() => ({
  campaigns: [] as MockCampaign[],
  capturedListInput: null as ListCampaignsInput | null,
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

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/campaigns", () => ({
  createCampaignRecord: async (input: CreateCampaignRecordInput) => {
    if (
      mockState.campaigns.some(
        (campaign) =>
          campaign.userId === input.userId && campaign.slug === input.slug,
      )
    ) {
      throw Object.assign(new Error("duplicate campaign slug"), { code: "23505" });
    }

    const campaign: MockCampaign = {
      ...input,
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: campaignId,
      linkCount: 0,
      updatedAt: new Date("2026-05-06T10:00:00.000Z"),
    };
    mockState.campaigns.push(campaign);

    return campaign;
  },
  deleteCampaignForUser: async ({
    id,
    userId,
  }: {
    id: string;
    userId: string;
  }) => {
    const campaign = mockState.campaigns.find(
      (item) => item.id === id && item.userId === userId,
    );
    if (!campaign) return null;

    mockState.campaigns = mockState.campaigns.filter((item) => item !== campaign);
    return { id: campaign.id };
  },
  findCampaignById: async (id: string) =>
    mockState.campaigns.find((campaign) => campaign.id === id) ?? null,
  isUniqueCampaignConstraintViolation: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505",
  listCampaignsByUserId: async (input: ListCampaignsInput) => {
    mockState.capturedListInput = input;

    return {
      items: mockState.campaigns.filter(
        (campaign) => campaign.userId === input.userId,
      ),
      total: mockState.total,
    };
  },
  updateCampaignRecordForUser: async (input: UpdateCampaignRecordInput) => {
    const campaign = mockState.campaigns.find(
      (item) => item.id === input.id && item.userId === input.userId,
    );
    if (!campaign) return null;

    if (
      input.slug &&
      mockState.campaigns.some(
        (item) =>
          item.id !== input.id &&
          item.userId === input.userId &&
          item.slug === input.slug,
      )
    ) {
      throw Object.assign(new Error("duplicate campaign slug"), { code: "23505" });
    }

    if (input.description !== undefined) campaign.description = input.description;
    if (input.name !== undefined) campaign.name = input.name;
    if (input.slug !== undefined) campaign.slug = input.slug;
    if (input.utmCampaign !== undefined) campaign.utmCampaign = input.utmCampaign;
    if (input.utmContent !== undefined) campaign.utmContent = input.utmContent;
    if (input.utmMedium !== undefined) campaign.utmMedium = input.utmMedium;
    if (input.utmSource !== undefined) campaign.utmSource = input.utmSource;
    if (input.utmTerm !== undefined) campaign.utmTerm = input.utmTerm;
    campaign.updatedAt = new Date("2026-05-06T12:00:00.000Z");

    return campaign;
  },
}));

import {
  GET as GETCampaigns,
  POST as POSTCampaign,
} from "../../src/app/api/v1/campaigns/route";
import {
  DELETE as DELETECampaign,
  GET as GETCampaign,
  PATCH as PATCHCampaign,
} from "../../src/app/api/v1/campaigns/[id]/route";

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

function createMockCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  return {
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    description: "Campaign description",
    id: campaignId,
    linkCount: 3,
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

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("campaigns API", () => {
  beforeEach(() => {
    mockState.campaigns = [createMockCampaign()];
    mockState.capturedListInput = null;
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.total = 1;
    mockState.userPlan = "PRO";
  });

  it("should create a campaign for the authenticated user", async () => {
    mockState.campaigns = [];

    const response = await POSTCampaign(
      createRequest("/api/v1/campaigns", "POST", {
        description: "",
        name: "Launch Q2",
        slug: "launch-q2",
        utmCampaign: "launch-q2",
        utmContent: "",
        utmMedium: "email",
        utmSource: "newsletter",
        utmTerm: "",
      }),
    );
    const body = await readJson<CampaignResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      description: null,
      linkCount: 0,
      name: "Launch Q2",
      slug: "launch-q2",
      utmContent: null,
      utmTerm: null,
    });
    expect("userId" in body.data).toBe(false);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:campaigns:post:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should list campaigns with link counts and pagination metadata", async () => {
    const response = await GETCampaigns(
      createRequest("/api/v1/campaigns?page=2&limit=5&search=ramadhan"),
    );
    const body = await readJson<CampaignResponse[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.meta).toEqual({ page: 2, limit: 5, total: 1 });
    expect(body.data[0]).toMatchObject({
      id: campaignId,
      linkCount: 3,
      name: "Ramadhan Sale",
      slug: "ramadhan-sale",
    });
    expect(mockState.capturedListInput).toEqual({
      limit: 5,
      page: 2,
      search: "ramadhan",
      userId: "user-1",
    });
  });

  it("should return one owned campaign detail", async () => {
    const response = await GETCampaign(
      createRequest(`/api/v1/campaigns/${campaignId}`),
      createContext(),
    );
    const body = await readJson<CampaignResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      id: campaignId,
      linkCount: 3,
      slug: "ramadhan-sale",
    });
    expect("userId" in body.data).toBe(false);
  });

  it("should update a campaign for the owner", async () => {
    const response = await PATCHCampaign(
      createRequest(`/api/v1/campaigns/${campaignId}`, "PATCH", {
        description: "",
        name: "Updated Campaign",
        slug: "updated-campaign",
        utmSource: "",
      }),
      createContext(),
    );
    const body = await readJson<CampaignResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toMatchObject({
      description: null,
      name: "Updated Campaign",
      slug: "updated-campaign",
      utmSource: null,
    });
  });

  it("should delete a campaign for the owner", async () => {
    const response = await DELETECampaign(
      createRequest(`/api/v1/campaigns/${campaignId}`, "DELETE"),
      createContext(),
    );
    const body = await readJson<{ deleted: boolean; id: string }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ deleted: true, id: campaignId });
    expect(mockState.campaigns).toEqual([]);
  });

  it("should reject direct object reference access", async () => {
    mockState.campaigns = [createMockCampaign({ userId: "user-2" })];

    const response = await GETCampaign(
      createRequest(`/api/v1/campaigns/${campaignId}`),
      createContext(),
    );
    const body = await readJson<CampaignResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should reject duplicate campaign slugs", async () => {
    mockState.campaigns.push(
      createMockCampaign({
        id: otherCampaignId,
        slug: "taken",
      }),
    );

    const response = await PATCHCampaign(
      createRequest(`/api/v1/campaigns/${campaignId}`, "PATCH", {
        slug: "taken",
      }),
      createContext(),
    );
    const body = await readJson<CampaignResponse>(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("CAMPAIGN_SLUG_ALREADY_EXISTS");
  });

  it("should reject invalid input and unauthenticated requests", async () => {
    const invalidResponse = await POSTCampaign(
      createRequest("/api/v1/campaigns", "POST", {
        name: "",
        slug: "bad slug",
      }),
    );
    const invalidBody = await readJson<CampaignResponse>(invalidResponse);
    expect(invalidResponse.status).toBe(400);
    expect(invalidBody.success).toBe(false);

    mockState.session = null;
    const unauthenticatedResponse = await GETCampaigns(
      createRequest("/api/v1/campaigns"),
    );
    const unauthenticatedBody = await readJson<CampaignResponse[]>(
      unauthenticatedResponse,
    );
    expect(unauthenticatedResponse.status).toBe(401);
    expect(unauthenticatedBody.success).toBe(false);
  });

  it("should reject requests over the API rate limit", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GETCampaigns(createRequest("/api/v1/campaigns"));
    const body = await readJson<CampaignResponse[]>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
