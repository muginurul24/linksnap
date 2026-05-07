import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type MockRateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

const mockState = vi.hoisted(() => ({
  calls: [] as Array<{ key: string; limit: number; windowSeconds: number }>,
  rateLimitResult: { limited: false, remaining: 99 } as MockRateLimitResult,
}));

vi.mock("@/lib/auth", () => ({
  auth: (handler: unknown) => handler,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }) => {
    mockState.calls.push(input);
    return mockState.rateLimitResult;
  },
}));

import proxy from "../../src/proxy";

function createRequest(pathname: string, userAgent = "Vitest"): NextRequest {
  return new NextRequest(`https://www.justqiu.cloud${pathname}`, {
    headers: {
      "x-forwarded-for": "203.0.113.40",
      "user-agent": userAgent,
    },
    method: "GET",
  });
}

describe("proxy redirect rate limit", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.rateLimitResult = { limited: false, remaining: 99 };
  });

  it("should return 429 for rate-limited single-segment public slugs", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await proxy(createRequest("/promo-flow"), {} as never);
    const body = (await response?.json()) as {
      error: { code: string };
      success: boolean;
    };

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("60");
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "'nonce-",
    );
    expect(body).toMatchObject({
      error: { code: "RATE_LIMITED" },
      success: false,
    });
    expect(mockState.calls).toEqual([
      {
        key: "redirect:slug:203.0.113.40",
        limit: 100,
        windowSeconds: 60,
      },
    ]);
  });

  it("should skip reserved public routes", async () => {
    const response = await proxy(createRequest("/login"), {} as never);

    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "'nonce-",
    );
    expect(mockState.calls).toEqual([]);
  });

  it("should skip known bot user agents", async () => {
    mockState.rateLimitResult = { limited: true, retryAfter: 60 };

    const response = await proxy(
      createRequest("/promo-flow", "Googlebot/2.1"),
      {} as never,
    );

    expect(response?.status).toBe(200);
    expect(response?.headers.get("Content-Security-Policy")).toContain(
      "'nonce-",
    );
    expect(mockState.calls).toEqual([]);
  });
});
