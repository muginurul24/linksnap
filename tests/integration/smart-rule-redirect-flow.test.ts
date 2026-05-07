import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

type MockSmartRule = {
  condition: unknown;
  destinationUrl: string;
  id: string;
  linkId: string;
  priority: number;
  type: "DEVICE" | "GEO" | "LANGUAGE" | "TIME";
};

type RedirectClickInput = {
  eventType: string;
  linkId: string;
  ruleId: string | null;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const ruleId = "86a44288-06d2-4662-9b49-0b51c7b11f2b";
const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  links: [] as MockLink[],
  loggedClicks: [] as RedirectClickInput[],
  requestHeaders: new Headers(),
  rules: [] as MockSmartRule[],
  session: { user: { id: "user-1" } } as MockSession,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => ({ limited: false as const, remaining: 99 }),
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async (key: string) => {
    mockState.cache.delete(key);
  },
  cacheGet: async <T>(key: string): Promise<T | null> =>
    (mockState.cache.get(key) as T | undefined) ?? null,
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(key, value);
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  findLinkById: async (id: string) =>
    mockState.links.find((link) => link.id === id) ?? null,
  findPublicLinkPageByLinkId: async () => null,
  findRedirectLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
  getUserPlanById: async () => "PRO",
}));

vi.mock("@/lib/db/queries/smart-rules", () => ({
  deleteSmartRuleForLink: async () => null,
  listSmartRulesByLinkId: async (id: string) =>
    mockState.rules.filter((rule) => rule.linkId === id),
  replaceSmartRulesForLink: async ({
    linkId,
    rules,
  }: {
    linkId: string;
    rules: Array<{
      condition: unknown;
      destinationUrl: string;
      priority: number;
      type: MockSmartRule["type"];
    }>;
  }) => {
    mockState.rules = [
      ...mockState.rules.filter((rule) => rule.linkId !== linkId),
      ...rules.map((rule, index) => ({
        ...rule,
        id: index === 0 ? ruleId : `00000000-0000-4000-8000-${index
          .toString()
          .padStart(12, "0")}`,
        linkId,
      })),
    ];

    return mockState.rules.filter((rule) => rule.linkId === linkId);
  },
}));

vi.mock("@/lib/db/queries/split-tests", () => ({
  findSplitTestByLinkId: async () => null,
  updateSplitTestVariantClickCount: async () => undefined,
}));

vi.mock("@/lib/analytics/click-logger", () => ({
  buildRedirectClickInput: (
    linkId: string,
    _headers: Headers,
    options?: { eventType?: string; ruleId?: string | null },
  ): RedirectClickInput => ({
    eventType: options?.eventType ?? "DIRECT_REDIRECT",
    linkId,
    ruleId: options?.ruleId ?? null,
  }),
  logRedirectClick: async (input: RedirectClickInput) => {
    mockState.loggedClicks.push(input);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => mockState.requestHeaders,
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
import { POST as POSTSmartRules } from "../../src/app/api/v1/links/[id]/rules/route";

function createMockLink(): MockLink {
  return {
    clickCount: 0,
    destinationUrl: "https://example.com/default",
    expiresAt: null,
    hasLinkPage: false,
    id: linkId,
    isActive: true,
    scheduledAt: null,
    slug: "smart-flow",
    title: "Smart flow",
    userId: "user-1",
  };
}

function createRulesRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/v1/links/${linkId}/rules`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createRulesContext() {
  return { params: Promise.resolve({ id: linkId }) };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

async function expectRedirectForUserAgent(
  userAgent: string,
  expectedUrl: string,
): Promise<void> {
  mockState.requestHeaders = new Headers({
    "user-agent": userAgent,
    "x-forwarded-for": "203.0.113.10",
  });

  await expect(
    RedirectPage({ params: Promise.resolve({ slug: "smart-flow" }) }),
  ).rejects.toMatchObject({
    message: "NEXT_REDIRECT",
    url: expectedUrl,
  });
}

describe("Smart Rule redirect flow", () => {
  beforeEach(() => {
    mockState.cache = new Map();
    mockState.links = [createMockLink()];
    mockState.loggedClicks = [];
    mockState.requestHeaders = new Headers();
    mockState.rules = [];
    mockState.session = { user: { id: "user-1" } };
  });

  it("should create rules then redirect different user agents to matching destinations", async () => {
    const response = await POSTSmartRules(
      createRulesRequest({
        rules: [
          {
            condition: { device: "mobile" },
            destinationUrl: "https://example.com/mobile",
            priority: 10,
            type: "DEVICE",
          },
        ],
      }),
      createRulesContext(),
    );
    const body = await readJson<{ rules: MockSmartRule[] }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    await expectRedirectForUserAgent(
      mobileUserAgent,
      "https://example.com/mobile",
    );
    await expectRedirectForUserAgent(
      desktopUserAgent,
      "https://example.com/default",
    );

    expect(mockState.loggedClicks).toEqual([
      { eventType: "DIRECT_REDIRECT", linkId, ruleId },
      { eventType: "DIRECT_REDIRECT", linkId, ruleId: null },
    ]);
  });
});
