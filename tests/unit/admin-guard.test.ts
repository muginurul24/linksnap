import { beforeEach, describe, expect, it, vi } from "vitest";

type MockRateLimit =
  | { limited: false; remaining: number }
  | { limited: true; retryAfter: number };

const mockState = vi.hoisted(() => ({
  authResult: { ok: true as const, userId: "admin-1" },
  dbRole: "superadmin",
  rateLimit: { limited: false, remaining: 29 } as MockRateLimit,
}));

vi.mock("@/lib/auth/superadmin", () => ({
  requireSuperAdmin: async () => mockState.authResult,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () =>
            mockState.dbRole
              ? [{ role: mockState.dbRole }]
              : [],
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async () => mockState.rateLimit,
}));

import { adminRouteGuard } from "../../src/lib/admin/guard";

async function readErrorCode(response: Response): Promise<string> {
  const body = (await response.json()) as {
    error?: { code?: string };
  };
  return body.error?.code ?? "";
}

describe("adminRouteGuard", () => {
  beforeEach(() => {
    mockState.authResult = { ok: true, userId: "admin-1" };
    mockState.dbRole = "superadmin";
    mockState.rateLimit = { limited: false, remaining: 29 };
  });

  it("should allow active superadmins", async () => {
    const result = await adminRouteGuard();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.admin.adminUserId).toBe("admin-1");
    }
  });

  it("should reject demoted superadmins after DB revalidation", async () => {
    mockState.dbRole = "user";

    const result = await adminRouteGuard();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
      expect(result.response.headers.get("X-Admin-Action")).toBe("true");
      expect(await readErrorCode(result.response)).toBe("SUPERADMIN_REQUIRED");
    }
  });

  it("should enforce the admin API rate limit", async () => {
    mockState.rateLimit = { limited: true, retryAfter: 42 };

    const result = await adminRouteGuard();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
      expect(result.response.headers.get("X-Admin-Action")).toBe("true");
      expect(await readErrorCode(result.response)).toBe("RATE_LIMITED");
    }
  });
});
