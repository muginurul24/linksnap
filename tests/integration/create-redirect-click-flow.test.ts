import type { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockLink = {
  clickCount: number;
  destinationUrl: string;
  expiresAt: Date | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: Date | null;
  slug: string;
  title?: string;
  userId: string;
};

type MockLinkPage = {
  brandLogo: string | null;
  brandName: string;
  countdownTarget: Date | null;
  ctaColor: string;
  ctaText: string;
  description: string | null;
  ogImage: string | null;
  showCountdown: boolean | null;
  showQrCode: boolean | null;
  showSocialProof: boolean | null;
  theme: string;
  title: string;
};

type MockSplitTest = {
  createdAt: Date;
  id: string;
  isActive: boolean;
  linkId: string;
  variants: Array<{
    clickCount: number;
    destinationUrl: string;
    id: string;
    weight: number;
  }>;
};

type CreateLinkRecordInput = {
  destinationUrl: string;
  slug: string;
  title?: string;
  userId: string;
};

type RedirectClickInput = {
  eventType: string;
  linkId: string;
  linkPageHasCountdown: boolean;
  referrer: string | null;
  ruleId: string | null;
  userAgent: string | null;
};

type RedirectClickOptions = {
  currentClickCount?: number;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

type MockRateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type CreateLinkResponse = {
  destinationUrl: string;
  id: string;
  shortUrl: string;
  slug: string;
};

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  clickCounts: new Map<string, number>(),
  linkPages: new Map<string, MockLinkPage>(),
  links: [] as MockLink[],
  loggedClicks: [] as RedirectClickInput[],
  loggedClickOptions: [] as RedirectClickOptions[],
  rateLimitResult: { limited: false, remaining: 99 } as MockRateLimitResult,
  ruleResult: null as { destinationUrl: string; ruleId: string } | null,
  session: { user: { id: "user-1" } } as MockSession,
  splitTest: null as MockSplitTest | null,
  updatedVariantClicks: [] as Array<{ clickCount: number; id: string }>,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => mockState.rateLimitResult,
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async (key: string) => mockState.cache.get(key) ?? null,
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(key, value);
  },
}));

vi.mock("@/lib/links/click-count-cache", () => ({
  getRedirectClickCountWithFallback: async ({
    fallbackClickCount,
    linkId,
  }: {
    fallbackClickCount?: number;
    linkId: string;
  }) =>
    mockState.clickCounts.get(linkId) ??
    mockState.links.find((link) => link.id === linkId)?.clickCount ??
    fallbackClickCount ??
    0,
  hydrateRedirectClickCounts: async <T>(links: T[]) => links,
}));

vi.mock("@/lib/db/queries/links", () => ({
  countLinksByUserId: async () => mockState.links.length,
  createLinkRecord: async (input: CreateLinkRecordInput) => {
    const link: MockLink = {
      clickCount: 0,
      destinationUrl: input.destinationUrl,
      expiresAt: null,
      hasLinkPage: false,
      id: `link-${mockState.links.length + 1}`,
      isActive: true,
      scheduledAt: null,
      slug: input.slug,
      title: input.title,
      userId: input.userId,
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
  findPublicLinkPageByLinkId: async (linkId: string) =>
    mockState.linkPages.get(linkId) ?? null,
  findRedirectLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => "PRO",
  isUniqueConstraintViolation: () => false,
  listLinksByUserId: async () => ({ items: [], total: 0 }),
}));

vi.mock("@/lib/analytics/click-logger", () => ({
  buildRedirectClickInput: (
    linkId: string,
    headers: Headers,
    options?: {
      eventType?: string;
      linkPageHasCountdown?: boolean;
      ruleId?: string | null;
    },
  ): RedirectClickInput => ({
    eventType: options?.eventType ?? "DIRECT_REDIRECT",
    linkId,
    linkPageHasCountdown: options?.linkPageHasCountdown ?? false,
    referrer: headers.get("referer"),
    ruleId: options?.ruleId ?? null,
    userAgent: headers.get("user-agent"),
  }),
  logRedirectClick: async (input: RedirectClickInput) => {
    mockState.loggedClicks.push(input);
  },
}));

vi.mock("@/lib/analytics/click-queue", () => ({
  recordRedirectClick: async (
    input: RedirectClickInput,
    options: RedirectClickOptions = {},
  ) => {
    mockState.loggedClicks.push(input);
    mockState.loggedClickOptions.push(options);
    return { status: "queued" };
  },
}));

vi.mock("@/lib/rules/rule-engine", () => ({
  buildRuleEvaluationContext: () => ({}),
  evaluateSmartRulesForLink: async () => mockState.ruleResult,
}));

vi.mock("@/lib/db/queries/split-tests", () => ({
  findSplitTestByLinkId: async (linkId: string) =>
    mockState.splitTest?.linkId === linkId ? mockState.splitTest : null,
  updateSplitTestVariantClickCount: async ({
    clickCount,
    id,
  }: {
    clickCount: number;
    id: string;
  }) => {
    mockState.updatedVariantClicks.push({ clickCount, id });
  },
}));

vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      referer: "https://referrer.example",
      "user-agent": "Vitest",
    }),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (callback: () => void) => {
      callback();
    },
  };
});

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  permanentRedirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

import RedirectPage from "../../src/app/[slug]/page";
import { GET as GETLinkPageCta } from "../../src/app/[slug]/go/route";
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

describe("create redirect click flow", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://linksnap.test";
    mockState.cache = new Map();
    mockState.clickCounts = new Map();
    mockState.linkPages = new Map();
    mockState.links = [];
    mockState.loggedClicks = [];
    mockState.loggedClickOptions = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.ruleResult = null;
    mockState.session = { user: { id: "user-1" } };
    mockState.splitTest = null;
    mockState.updatedVariantClicks = [];
  });

  afterAll(() => {
    if (previousBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
      return;
    }

    process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl;
  });

  it("should create a link then redirect and log the click", async () => {
    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com/promo",
        slug: "promo-flow",
      }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.slug).toBe("promo-flow");

    await expect(
      RedirectPage({ params: Promise.resolve({ slug: "promo-flow" }) }),
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "https://example.com/promo",
    });

    expect(mockState.loggedClicks).toEqual([
      {
        eventType: "DIRECT_REDIRECT",
        linkId: "link-1",
        linkPageHasCountdown: false,
        referrer: "https://referrer.example",
        ruleId: null,
        userAgent: "Vitest",
      },
    ]);
    expect(mockState.loggedClickOptions).toEqual([{ currentClickCount: 0 }]);
  });

  it("should apply a matching Smart Rule destination during direct redirect", async () => {
    mockState.ruleResult = {
      destinationUrl: "https://example.com/mobile",
      ruleId: "rule-mobile",
    };

    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com/default",
        slug: "rule-flow",
      }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    await expect(
      RedirectPage({ params: Promise.resolve({ slug: "rule-flow" }) }),
    ).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
      url: "https://example.com/mobile",
    });

    expect(mockState.loggedClicks).toEqual([
      {
        eventType: "DIRECT_REDIRECT",
        linkId: "link-1",
        linkPageHasCountdown: false,
        referrer: "https://referrer.example",
        ruleId: "rule-mobile",
        userAgent: "Vitest",
      },
    ]);
    expect(mockState.loggedClickOptions).toEqual([{ currentClickCount: 0 }]);
  });

  it("should select split test variant destination during direct redirect", async () => {
    const response = await POST(
      createJsonRequest({
        destinationUrl: "https://example.com/default",
        slug: "split-flow",
      }),
    );
    const body = await readJson<CreateLinkResponse>(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    if (!body.success) return;

    mockState.splitTest = {
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "split-test-1",
      isActive: true,
      linkId: body.data.id,
      variants: [
        {
          clickCount: 0,
          destinationUrl: "https://example.com/a",
          id: "variant-a",
          weight: 50,
        },
        {
          clickCount: 4,
          destinationUrl: "https://example.com/b",
          id: "variant-b",
          weight: 50,
        },
      ],
    };
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.75);

    try {
      await expect(
        RedirectPage({ params: Promise.resolve({ slug: "split-flow" }) }),
      ).rejects.toMatchObject({
        message: "NEXT_REDIRECT",
        url: "https://example.com/b",
      });
    } finally {
      randomSpy.mockRestore();
    }

    expect(mockState.updatedVariantClicks).toEqual([
      { clickCount: 5, id: "variant-b" },
    ]);
    expect(mockState.loggedClicks).toEqual([
      {
        eventType: "DIRECT_REDIRECT",
        linkId: body.data.id,
        linkPageHasCountdown: false,
        referrer: "https://referrer.example",
        ruleId: null,
        userAgent: "Vitest",
      },
    ]);
    expect(mockState.loggedClickOptions).toEqual([{ currentClickCount: 0 }]);
  });

  it("should render a Link Page view then log CTA click-through redirects", async () => {
    mockState.links = [
      {
        clickCount: 7,
        destinationUrl: "https://example.com/page",
        expiresAt: null,
        hasLinkPage: true,
        id: "link-page-1",
        isActive: true,
        scheduledAt: null,
        slug: "page-flow",
        title: "Page flow",
        userId: "user-1",
      },
    ];
    mockState.linkPages.set("link-page-1", {
      brandLogo: null,
      brandName: "Brand",
      countdownTarget: new Date("2026-05-08T10:00:00.000Z"),
      ctaColor: "#111827",
      ctaText: "Continue",
      description: "Link Page description",
      ogImage: null,
      showCountdown: true,
      showQrCode: false,
      showSocialProof: true,
      theme: "light",
      title: "Link Page title",
    });

    await expect(
      RedirectPage({ params: Promise.resolve({ slug: "page-flow" }) }),
    ).resolves.toBeTruthy();

    const ctaResponse = await GETLinkPageCta(
      new Request("http://localhost:3000/page-flow/go"),
      { params: Promise.resolve({ slug: "page-flow" }) },
    );

    expect(ctaResponse.status).toBe(308);
    expect(ctaResponse.headers.get("location")).toBe("https://example.com/page");
    expect(mockState.loggedClicks).toEqual([
      {
        eventType: "LINK_PAGE_VIEW",
        linkId: "link-page-1",
        linkPageHasCountdown: true,
        referrer: "https://referrer.example",
        ruleId: null,
        userAgent: "Vitest",
      },
      {
        eventType: "LINK_PAGE_CTA_CLICK",
        linkId: "link-page-1",
        linkPageHasCountdown: true,
        referrer: "https://referrer.example",
        ruleId: null,
        userAgent: "Vitest",
      },
    ]);
    expect(mockState.loggedClickOptions).toEqual([
      {},
      { currentClickCount: 7 },
    ]);
  });

  it("should return 429 for rate-limited Link Page CTA requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const ctaResponse = await GETLinkPageCta(
      new Request("http://localhost:3000/page-flow/go", {
        headers: {
          "x-forwarded-for": "203.0.113.20",
          "user-agent": "Vitest",
        },
      }),
      { params: Promise.resolve({ slug: "page-flow" }) },
    );
    const body = await readJson<never>(ctaResponse);

    expect(ctaResponse.status).toBe(429);
    expect(ctaResponse.headers.get("Retry-After")).toBe("60");
    expect(body).toMatchObject({
      error: { code: "RATE_LIMITED" },
      success: false,
    });
    expect(mockState.loggedClicks).toEqual([]);
  });
});
