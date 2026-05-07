import { beforeEach, describe, expect, it, vi } from "vitest";

type MockLink = {
  clickCount: number;
  destinationUrl: string;
  expiresAt: Date | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: Date | null;
  slug: string;
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

const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  link: null as MockLink | null,
  splitTest: null as MockSplitTest | null,
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async (key: string) => mockState.cache.get(key) ?? null,
  cacheSet: async (key: string, value: unknown) => {
    mockState.cache.set(key, value);
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  findPublicLinkPageByLinkId: async () => null,
  findRedirectLinkBySlug: async (slug: string) =>
    mockState.link?.slug === slug ? mockState.link : null,
}));

vi.mock("@/lib/db/queries/split-tests", () => ({
  findSplitTestByLinkId: async (id: string) =>
    mockState.splitTest?.linkId === id ? mockState.splitTest : null,
  updateSplitTestVariantClickCount: async ({
    clickCount,
    id,
  }: {
    clickCount: number;
    id: string;
  }) => {
    const variant = mockState.splitTest?.variants.find((item) => item.id === id);
    if (variant) variant.clickCount = clickCount;
  },
}));

vi.mock("@/lib/rules/rule-engine", () => ({
  buildRuleEvaluationContext: () => ({}),
  evaluateSmartRulesForLink: async () => null,
}));

vi.mock("@/lib/analytics/click-logger", () => ({
  buildRedirectClickInput: () => ({
    eventType: "DIRECT_REDIRECT",
    linkId,
    linkPageHasCountdown: false,
    referrer: null,
    ruleId: null,
    userAgent: null,
  }),
  logRedirectClick: async () => undefined,
}));

vi.mock("@/lib/analytics/click-queue", () => ({
  recordRedirectClick: async () => ({ status: "queued" }),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
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

describe("split test redirect distribution", () => {
  beforeEach(() => {
    mockState.cache = new Map();
    mockState.link = {
      clickCount: 0,
      destinationUrl: "https://example.com/default",
      expiresAt: null,
      hasLinkPage: false,
      id: linkId,
      isActive: true,
      scheduledAt: null,
      slug: "split-distribution",
    };
    mockState.splitTest = {
      createdAt: new Date("2026-05-06T10:00:00.000Z"),
      id: "split-test-1",
      isActive: true,
      linkId,
      variants: [
        {
          clickCount: 0,
          destinationUrl: "https://example.com/a",
          id: "variant-a",
          weight: 70,
        },
        {
          clickCount: 0,
          destinationUrl: "https://example.com/b",
          id: "variant-b",
          weight: 30,
        },
      ],
    };
  });

  it("should distribute one hundred redirects according to variant weights", async () => {
    const randomValues = Array.from({ length: 100 }, (_, index) => index / 100);
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockImplementation(() => randomValues.shift() ?? 0);
    const counts = new Map<string, number>();

    try {
      for (let index = 0; index < 100; index += 1) {
        await expect(
          RedirectPage({ params: Promise.resolve({ slug: "split-distribution" }) }),
        ).rejects.toMatchObject({ message: "NEXT_REDIRECT" });
      }
    } finally {
      randomSpy.mockRestore();
    }

    for (const variant of mockState.splitTest?.variants ?? []) {
      counts.set(variant.id, variant.clickCount);
    }

    expect(counts.get("variant-a")).toBe(70);
    expect(counts.get("variant-b")).toBe(30);
  });
});
