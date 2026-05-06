import { NextRequest } from "next/server";
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
  userId: string;
};

type MockLinkPage = {
  brandName: string;
  countdownTarget: Date | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  id: string;
  linkId: string;
  ogImage: string | null;
  showCountdown: boolean | null;
  showQrCode: boolean | null;
  showSocialProof: boolean | null;
  theme: string;
  title: string;
  updatedAt: Date;
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

type LinkPageApiResponse = {
  linkId: string;
  linkPage: {
    brandName: string;
    ctaColor: string;
    ctaText: string;
    description: string | null;
    id: string;
    linkId: string;
    ogImage: string | null;
    showCountdown: boolean;
    showQrCode: boolean;
    showSocialProof: boolean;
    theme: string;
    title: string;
  } | null;
};

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const otherLinkId = "7c4a7a24-7348-4a94-81c6-b837364cf605";

const mockState = vi.hoisted(() => ({
  cacheDeleteKeys: [] as string[],
  linkPageCount: 0,
  linkPages: [] as MockLinkPage[],
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
  countLinkPagesByUserId: async () => mockState.linkPageCount,
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  findLinkPageByLinkId: async (id: string) =>
    mockState.linkPages.find((page) => page.linkId === id) ?? null,
  getUserPlanById: async () => mockState.userPlan,
  setLinkPageEnabledForUser: async ({
    id,
    userId,
  }: {
    enabled: boolean;
    id: string;
    userId: string;
  }) => {
    const link = mockState.links.find((item) => item.id === id && item.userId === userId);
    return link ? { id: link.id } : null;
  },
  upsertLinkPageForLink: async (input: {
    brandName: string;
    countdownTarget: Date | null;
    ctaColor: string;
    ctaText: string;
    description: string | null;
    linkId: string;
    ogImage: string | null;
    showCountdown: boolean;
    showQrCode: boolean;
    showSocialProof: boolean;
    theme: string;
    title: string;
  }) => {
    const existing = mockState.linkPages.find((page) => page.linkId === input.linkId);
    const page: MockLinkPage = {
      ...existing,
      ...input,
      id: existing?.id ?? "page-1",
      updatedAt: new Date("2026-05-06T12:00:00.000Z"),
    };

    mockState.linkPages = [
      ...mockState.linkPages.filter((item) => item.linkId !== input.linkId),
      page,
    ];

    return page;
  },
}));

import { GET, POST } from "../../src/app/api/v1/links/[id]/page/route";

function createRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}/page`, {
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
    id: linkId,
    slug: "promo",
    userId: "user-1",
    ...overrides,
  };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("link page API", () => {
  beforeEach(() => {
    mockState.cacheDeleteKeys = [];
    mockState.linkPageCount = 0;
    mockState.linkPages = [];
    mockState.links = [createMockLink()];
    mockState.rateLimitOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
  });

  it("should create a Link Page for an owned link", async () => {
    const response = await POST(
      createRequest("POST", {
        brandName: "Brand",
        ctaColor: "#111827",
        ctaText: "Shop now",
        description: "Promo description",
        ogImage: "https://example.com/og.png",
        title: "Promo page",
      }),
      createContext(),
    );
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data.linkPage).toMatchObject({
      brandName: "Brand",
      ctaText: "Shop now",
      linkId,
      showCountdown: false,
      showQrCode: true,
      showSocialProof: true,
      title: "Promo page",
    });
    expect(mockState.cacheDeleteKeys).toEqual(["redirect:promo"]);
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:links:page:post:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should return existing Link Page config", async () => {
    mockState.linkPages = [
      {
        brandName: "Brand",
        countdownTarget: null,
        ctaColor: "#111827",
        ctaText: "Shop now",
        description: null,
        id: "page-1",
        linkId,
        ogImage: null,
        showCountdown: null,
        showQrCode: null,
        showSocialProof: null,
        theme: "auto",
        title: "Promo page",
        updatedAt: new Date("2026-05-06T12:00:00.000Z"),
      },
    ];

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.linkPage).toMatchObject({
      showCountdown: false,
      showQrCode: true,
      showSocialProof: true,
      title: "Promo page",
    });
  });

  it("should reject direct object reference access", async () => {
    mockState.links = [createMockLink({ userId: "user-2" })];

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should reject invalid Link Page input", async () => {
    const response = await POST(
      createRequest("POST", {
        brandName: "",
        ctaColor: "blue",
        title: "",
      }),
      createContext(),
    );
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject new Link Pages when quota is reached", async () => {
    mockState.userPlan = "FREE";
    mockState.linkPageCount = 3;

    const response = await POST(
      createRequest("POST", {
        brandName: "Brand",
        title: "Promo page",
      }),
      createContext(),
    );
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("LINK_PAGE_QUOTA_EXCEEDED");
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("should reject invalid link IDs", async () => {
    const response = await GET(createRequest("GET"), createContext("not-a-uuid"));
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject requests when rate limited", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest("GET"), createContext());
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("should return not found for missing links", async () => {
    const response = await GET(createRequest("GET"), createContext(otherLinkId));
    const body = await readJson<LinkPageApiResponse>(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("LINK_NOT_FOUND");
  });
});
