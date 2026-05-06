import { NextRequest } from "next/server";
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

type RateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

type ApiEnvelope =
  | { success: true }
  | {
      error: {
        code: string;
      };
      success: false;
    };

const mockState = vi.hoisted(() => ({
  cache: new Map<string, unknown>(),
  cacheSetCalls: [] as Array<{ key: string; ttl: number; value: unknown }>,
  links: [] as MockLink[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
}));

vi.mock("@/lib/db/queries/links", () => ({
  findRedirectLinkBySlug: async (slug: string) =>
    mockState.links.find((link) => link.slug === slug) ?? null,
}));

vi.mock("@/lib/redis", () => ({
  cacheGet: async <T>(key: string): Promise<T | null> =>
    (mockState.cache.get(key) as T | undefined) ?? null,
  cacheSet: async (key: string, value: unknown, ttl: number) => {
    mockState.cache.set(key, value);
    mockState.cacheSetCalls.push({ key, ttl, value });
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => mockState.rateLimitResult,
}));

import {
  GET,
  getQrCodeCacheKey,
} from "../../src/app/api/v1/qr/[slug]/route";

function createMockLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    clickCount: 0,
    destinationUrl: "https://example.com/default",
    expiresAt: null,
    hasLinkPage: false,
    id: "link-1",
    isActive: true,
    scheduledAt: null,
    slug: "promo",
    ...overrides,
  };
}

function createRequest(query = ""): NextRequest {
  return new NextRequest(`https://linksnap.test/api/v1/qr/promo${query}`, {
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

function createContext(slug = "promo") {
  return { params: Promise.resolve({ slug }) };
}

async function readJson(response: Response): Promise<ApiEnvelope> {
  return response.json() as Promise<ApiEnvelope>;
}

describe("QR API", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockState.cache = new Map();
    mockState.cacheSetCalls = [];
    mockState.links = [createMockLink()];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
  });

  it("should generate a PNG QR code for an active public slug", async () => {
    const response = await GET(createRequest(), createContext());
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(mockState.cacheSetCalls).toHaveLength(1);
    expect(mockState.cacheSetCalls[0]).toMatchObject({
      key: getQrCodeCacheKey({ format: "png", size: 300, slug: "promo" }),
      ttl: 86_400,
    });
  });

  it("should generate an SVG QR code with a custom size", async () => {
    const response = await GET(createRequest("?format=svg&size=256"), createContext());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(body).toContain("<svg");
    expect(mockState.cacheSetCalls[0]).toMatchObject({
      key: getQrCodeCacheKey({ format: "svg", size: 256, slug: "promo" }),
      ttl: 86_400,
    });
  });

  it("should return cached QR code content when available", async () => {
    const cacheKey = getQrCodeCacheKey({ format: "svg", size: 300, slug: "promo" });
    mockState.cache.set(cacheKey, Buffer.from("<svg>cached</svg>").toString("base64"));

    const response = await GET(createRequest("?format=svg"), createContext());

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<svg>cached</svg>");
    expect(mockState.cacheSetCalls).toEqual([]);
  });

  it("should reject invalid QR query input", async () => {
    const response = await GET(createRequest("?format=pdf&size=20"), createContext());
    const body = await readJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return not found when link is unavailable", async () => {
    mockState.links = [createMockLink({ isActive: false })];

    const response = await GET(createRequest(), createContext());
    const body = await readJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("LINK_NOT_FOUND");
  });

  it("should rate limit public QR generation requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await GET(createRequest(), createContext());
    const body = await readJson(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.cacheSetCalls).toEqual([]);
  });
});
