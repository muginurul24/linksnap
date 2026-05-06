import type { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockLink = {
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

type CreateLinkRecordInput = {
  destinationUrl: string;
  slug: string;
  title?: string;
  userId: string;
};

type RedirectClickInput = {
  linkId: string;
  referrer: string | null;
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
  links: [] as MockLink[],
  loggedClicks: [] as RedirectClickInput[],
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
  findPublicLinkPageByLinkId: async () => null,
  findRedirectLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => "PRO",
  isUniqueConstraintViolation: () => false,
  listLinksByUserId: async () => ({ items: [], total: 0 }),
}));

vi.mock("@/lib/analytics/click-logger", () => ({
  buildRedirectClickInput: (linkId: string, headers: Headers): RedirectClickInput => ({
    linkId,
    referrer: headers.get("referer"),
    userAgent: headers.get("user-agent"),
  }),
  logRedirectClick: async (input: RedirectClickInput) => {
    mockState.loggedClicks.push(input);
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
    mockState.links = [];
    mockState.loggedClicks = [];
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
        linkId: "link-1",
        referrer: "https://referrer.example",
        userAgent: "Vitest",
      },
    ]);
  });
});
