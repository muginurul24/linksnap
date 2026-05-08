import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardOverview } from "../../src/lib/dashboard/overview";

type MockSession = {
  user: {
    id: string;
  };
} | null;

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

const mockOverview: DashboardOverview = {
  activeCampaigns: 2,
  clickTrend: [
    { clicks: 4, date: "2026-05-01", label: "May 1" },
    { clicks: 0, date: "2026-05-02", label: "May 2" },
    { clicks: 9, date: "2026-05-03", label: "May 3" },
    { clicks: 0, date: "2026-05-04", label: "May 4" },
    { clicks: 0, date: "2026-05-05", label: "May 5" },
    { clicks: 0, date: "2026-05-06", label: "May 6" },
    { clicks: 3, date: "2026-05-07", label: "May 7" },
  ],
  clicksToday: 3,
  qrScans: 1,
  recentLinks: [
    {
      clicks: 12,
      createdAt: "2026-05-06T13:45:00.000Z",
      createdLabel: "1 day ago",
      destinationUrl: "https://example.com",
      hasLinkPage: true,
      id: "link-1",
      slug: "promo",
      title: "Promo",
    },
  ],
  topCountries: [{ clicks: 8, country: "ID" }],
  totalLinks: 4,
};

const mockState = vi.hoisted(() => ({
  capturedUserId: null as string | null,
  overview: null as DashboardOverview | null,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "user-1" } } as MockSession,
  userPlan: "PRO" as "FREE" | "PRO" | "BUSINESS" | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/dashboard", () => ({
  getDashboardOverviewByUserId: async ({ userId }: { userId: string }) => {
    mockState.capturedUserId = userId;
    return mockState.overview;
  },
}));

vi.mock("@/lib/db/queries/links", () => ({
  getUserPlanById: async () => mockState.userPlan,
}));

vi.mock("@/lib/db/queries/mobile-auth", () => ({
  findMobileSessionUserById: async (userId: string) => {
    if (!mockState.userPlan) return null;
    return {
      avatarUrl: null,
      deletedAt: null,
      email: "user@example.com",
      emailVerified: new Date("2026-05-01T00:00:00.000Z"),
      id: userId,
      name: "User",
      passwordHash: "hash",
      plan: mockState.userPlan,
      refreshTokenHash: null,
      role: "user",
      twoFactorEnabled: false,
      twoFactorSecret: null,
    };
  },
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

import { GET } from "../../src/app/api/v1/dashboard/overview/route";
import { createMobileAccessToken } from "../../src/lib/auth/mobile-token";

function createRequest(token?: string): NextRequest {
  return new Request("http://localhost/api/v1/dashboard/overview", {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("dashboard overview API", () => {
  beforeEach(() => {
    mockState.capturedUserId = null;
    mockState.overview = mockOverview;
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: "user-1" } };
    mockState.userPlan = "PRO";
    process.env.AUTH_SECRET = "test-auth-secret-with-at-least-thirty-two-chars";
  });

  it("should return overview data for the authenticated user", async () => {
    const response = await GET(createRequest());
    const body = await readJson<DashboardOverview>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;

    expect(body.data).toEqual(mockOverview);
    expect(mockState.capturedUserId).toBe("user-1");
    expect(mockState.rateLimitOptions).toEqual([
      { key: "api:dashboard:overview:user-1", limit: 60, windowSeconds: 60 },
    ]);
  });

  it("should accept mobile bearer tokens when no cookie session exists", async () => {
    mockState.session = null;
    const token = createMobileAccessToken({
      email: "user@example.com",
      id: "user-1",
      plan: "PRO",
      role: "user",
    });

    const response = await GET(createRequest(token));
    const body = await readJson<DashboardOverview>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.capturedUserId).toBe("user-1");
  });

  it("should reject unauthenticated requests", async () => {
    mockState.session = null;

    const response = await GET(createRequest());
    const body = await readJson<DashboardOverview>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
    expect(mockState.capturedUserId).toBeNull();
  });

  it("should rate limit dashboard overview requests", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 30 };

    const response = await GET(createRequest());
    const body = await readJson<DashboardOverview>(response);

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(mockState.capturedUserId).toBeNull();
  });
});
