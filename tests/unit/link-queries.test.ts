import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  EditableLink,
  EditableLinkPage,
  EditableSmartRule,
} from "../../src/lib/db/queries/links";

const mockState = vi.hoisted(() => ({
  link: null as EditableLink | null,
  linkPage: null as EditableLinkPage | null,
  linkQueries: [] as unknown[][],
  ruleQueries: [] as unknown[][],
  smartRules: [] as EditableSmartRule[],
}));

vi.mock("@/lib/db/schema", () => ({
  linkPages: {
    linkId: "linkPages.linkId",
  },
  links: {
    slug: "links.slug",
    userId: "links.userId",
  },
  smartRules: {
    linkId: "smartRules.linkId",
  },
  users: {
    id: "users.id",
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      linkPages: {
        findFirst: async (query: unknown) => {
          mockState.linkQueries.push(["linkPages.findFirst", query]);
          return mockState.linkPage;
        },
      },
      links: {
        findFirst: async (query: unknown) => {
          mockState.linkQueries.push(["links.findFirst", query]);
          return mockState.link;
        },
      },
      smartRules: {
        findMany: async (query: unknown) => {
          mockState.ruleQueries.push(["smartRules.findMany", query]);
          return mockState.smartRules;
        },
      },
    },
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => ({ conditions, operator: "and" }),
  count: () => "count",
  desc: (column: unknown) => ({ column, operator: "desc" }),
  eq: (column: unknown, value: unknown) => ({ column, operator: "eq", value }),
  ilike: (column: unknown, value: unknown) => ({
    column,
    operator: "ilike",
    value,
  }),
  or: (...conditions: unknown[]) => ({ conditions, operator: "or" }),
}));

import { findEditableLinkBySlugForUser } from "../../src/lib/db/queries/links";

function createEditableLink(overrides: Partial<EditableLink> = {}): EditableLink {
  return {
    campaignId: null,
    clickCount: 0,
    createdAt: new Date("2026-05-06T10:00:00.000Z"),
    destinationUrl: "https://example.com",
    expiresAt: null,
    hasLinkPage: true,
    id: "link-1",
    isActive: true,
    linkPage: null,
    scheduledAt: null,
    slug: "promo",
    smartRules: [],
    title: "Promo",
    updatedAt: new Date("2026-05-06T11:00:00.000Z"),
    userId: "user-1",
    ...overrides,
  };
}

describe("link queries", () => {
  beforeEach(() => {
    mockState.link = null;
    mockState.linkPage = null;
    mockState.linkQueries = [];
    mockState.ruleQueries = [];
    mockState.smartRules = [];
  });

  it("should return null when editable link is not found for the owner", async () => {
    await expect(
      findEditableLinkBySlugForUser("promo", "user-1"),
    ).resolves.toBeNull();

    expect(mockState.linkQueries).toHaveLength(1);
    expect(mockState.ruleQueries).toEqual([]);
  });

  it("should load editable link page and smart rule data in batch", async () => {
    mockState.link = createEditableLink();
    mockState.linkPage = {
      brandName: "Brand",
      ctaColor: "#111827",
      ctaText: "Continue",
      description: "Promo description",
      title: "Promo page",
    };
    mockState.smartRules = [
      {
        condition: { device: "mobile" },
        destinationUrl: "https://m.example.com",
        id: "rule-1",
        priority: 0,
        type: "DEVICE",
      },
    ];

    await expect(
      findEditableLinkBySlugForUser("promo", "user-1"),
    ).resolves.toMatchObject({
      destinationUrl: "https://example.com",
      linkPage: mockState.linkPage,
      smartRules: mockState.smartRules,
      slug: "promo",
    });

    expect(mockState.linkQueries.map(([name]) => name)).toEqual([
      "links.findFirst",
      "linkPages.findFirst",
    ]);
    expect(mockState.ruleQueries.map(([name]) => name)).toEqual([
      "smartRules.findMany",
    ]);
  });
});
