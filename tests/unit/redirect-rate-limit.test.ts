import { beforeEach, describe, expect, it, vi } from "vitest";

type MockRateLimitResult =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

const mockState = vi.hoisted(() => ({
  calls: [] as Array<{ key: string; limit: number; windowSeconds: number }>,
  result: { limited: false, remaining: 99 } as MockRateLimitResult,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }) => {
    mockState.calls.push(input);
    return mockState.result;
  },
}));

import {
  checkRedirectRateLimit,
  createRedirectRateLimitResponse,
  getRedirectRateLimitClientKey,
  isKnownBotUserAgent,
} from "../../src/lib/security/redirect-rate-limit";

describe("redirect rate limit", () => {
  beforeEach(() => {
    mockState.calls = [];
    mockState.result = { limited: false, remaining: 99 };
  });

  it("should use the first forwarded client IP for rate limit keys", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.4",
    });

    expect(getRedirectRateLimitClientKey(headers)).toBe("203.0.113.10");
  });

  it("should apply slug redirect threshold when request is not a known bot", async () => {
    await checkRedirectRateLimit({
      headers: new Headers({
        "cf-connecting-ip": "203.0.113.11",
        "user-agent": "Mozilla/5.0",
      }),
      kind: "slug",
    });

    expect(mockState.calls).toEqual([
      {
        key: "redirect:slug:203.0.113.11",
        limit: 100,
        windowSeconds: 60,
      },
    ]);
  });

  it("should apply CTA redirect threshold", async () => {
    await checkRedirectRateLimit({
      headers: new Headers({
        "x-real-ip": "203.0.113.12",
        "user-agent": "Mozilla/5.0",
      }),
      kind: "cta",
    });

    expect(mockState.calls).toEqual([
      {
        key: "redirect:cta:203.0.113.12",
        limit: 30,
        windowSeconds: 60,
      },
    ]);
  });

  it("should skip known bot user agents", async () => {
    const result = await checkRedirectRateLimit({
      headers: new Headers({
        "cf-connecting-ip": "203.0.113.13",
        "user-agent": "Googlebot/2.1",
      }),
      kind: "slug",
    });

    expect(isKnownBotUserAgent("Googlebot/2.1")).toBe(true);
    expect(result.limited).toBe(false);
    expect(mockState.calls).toEqual([]);
  });

  it("should return a retry-after 429 response when limited", async () => {
    mockState.result = { limited: true, retryAfter: 60 };

    const result = await checkRedirectRateLimit({
      headers: new Headers({
        "cf-connecting-ip": "203.0.113.14",
        "user-agent": "Mozilla/5.0",
      }),
      kind: "slug",
    });

    expect(result).toEqual({ limited: true, retryAfter: 60 });
    if (!result.limited) return;

    const response = createRedirectRateLimitResponse(result);
    const body = (await response.json()) as {
      error: { code: string };
      success: boolean;
    };

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(body).toMatchObject({
      error: { code: "RATE_LIMITED" },
      success: false,
    });
  });
});
