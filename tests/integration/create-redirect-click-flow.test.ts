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
  cache: new Map<string, unknown>(),
  linkPages: new Map<string, MockLinkPage>(),
  links: [] as MockLink[],
  loggedClicks: [] as RedirectClickInput[],
  ruleResult: null as { destinationUrl: string; ruleId: string } | null,
  session: { user: { id: "user-1" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => ({ limited: false as const, remaining: 99 }),
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async (key: string) => mockState.cache.get(key) ?? null,
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(key, value);
  },
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

vi.mock("@/lib/rules/rule-engine", () => ({
  buildRuleEvaluationContext: () => ({}),
  evaluateSmartRulesForLink: async () => mockState.ruleResult,
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
    mockState.linkPages = new Map();
    mockState.links = [];
    mockState.loggedClicks = [];
    mockState.ruleResult = null;
    mockState.session = { user: { id: "user-1" } };
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
  });
});
