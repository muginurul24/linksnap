import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ApiEnvelope<T> =
  | { data: T; meta?: Record<string, unknown>; success: true }
  | { error: { code: string; message: string }; success: false };

type NextRequestInit = ConstructorParameters<typeof NextRequest>[1];

const mockState = vi.hoisted(() => ({
  auditWrites: [] as Array<Record<string, unknown>>,
  guardOk: true,
  listedUsers: [
    {
      createdAt: new Date("2026-05-08T00:00:00Z"),
      deletedAt: null,
      email: "user@example.com",
      emailVerified: new Date("2026-05-08T00:00:00Z"),
      id: "user-1",
      linkCount: 3,
      name: "User One",
      plan: "FREE" as const,
      role: "user",
    },
  ],
  stats: {
    linksLast30Days: 8,
    planDistribution: { BUSINESS: 0, FREE: 1, PRO: 0 },
    totalClicks: 30,
    totalLinks: 8,
    totalRevenueIdr: 128000,
    totalUsers: 1,
    usersLast30Days: 1,
  },
  userDetail: {
    avatarUrl: null,
    createdAt: new Date("2026-05-08T00:00:00Z"),
    deletedAt: null,
    email: "user@example.com",
    emailVerified: new Date("2026-05-08T00:00:00Z"),
    googleId: null,
    id: "user-1",
    linkCount: 3,
    name: "User One",
    plan: "FREE" as const,
    role: "user",
    subscriptionPlan: null,
    subscriptionStatus: null,
    totalClicks: 30,
    twoFactorEnabled: false,
    updatedAt: new Date("2026-05-08T00:00:00Z"),
  },
}));

vi.mock("@/lib/admin/guard", () => ({
  adminRouteGuard: async () =>
    mockState.guardOk
      ? {
          admin: {
            adminUserId: "admin-1",
            requestId: "request-1",
          },
          ok: true,
        }
      : {
          ok: false,
          response: NextResponse.json(
            {
              error: { code: "SUPERADMIN_REQUIRED", message: "Forbidden" },
              success: false,
            },
            { status: 403 },
          ),
        },
  withAdminActionHeader: (response: NextResponse) => {
    response.headers.set("X-Admin-Action", "true");
    return response;
  },
}));

vi.mock("@/lib/admin/audit", () => ({
  writeAdminAuditLog: async (input: Record<string, unknown>) => {
    mockState.auditWrites.push(input);
  },
}));

vi.mock("@/lib/db/queries/admin", () => ({
  ADMIN_ANALYTICS_WINDOW_DAYS: 30,
  getSystemStats: async () => mockState.stats,
  getUserDetailById: async () => mockState.userDetail,
  listAllUsers: async () => ({ total: mockState.listedUsers.length, users: mockState.listedUsers }),
  suspendUser: async () => true,
  unsuspendUser: async () => true,
  updateUserPlan: async () => ({ previousPlan: "FREE", updated: true }),
}));

vi.mock("@/lib/redis", () => ({
  cacheDelete: async () => {},
  cacheGet: async () => null,
  cacheSet: async () => {},
}));

vi.mock("@/lib/db/queries/admin-audit", () => ({
  listAdminAuditLogs: async () => ({
    entries: [
      {
        action: "user.plan.change",
        adminUserId: "admin-1",
        createdAt: new Date("2026-05-08T00:00:00Z"),
        id: "audit-1",
        ipAddress: null,
        metadata: { previousPlan: "FREE", newPlan: "PRO" },
        targetUserId: "user-1",
      },
    ],
    total: 1,
  }),
}));

import { GET as getAuditLog } from "../../src/app/api/v1/admin/audit-log/route";
import { GET as getAnalytics } from "../../src/app/api/v1/admin/analytics/route";
import { GET as listUsers } from "../../src/app/api/v1/admin/users/route";
import {
  GET as getUser,
  PATCH as updateUser,
  POST as suspendOrUnsuspendUser,
} from "../../src/app/api/v1/admin/users/[id]/route";

function createRequest(path: string, init?: NextRequestInit): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, init);
}

function routeContext(id = "user-1") {
  return { params: Promise.resolve({ id }) };
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("admin API routes", () => {
  beforeEach(() => {
    mockState.auditWrites = [];
    mockState.guardOk = true;
  });

  it("should list users with the admin action header", async () => {
    const response = await listUsers(createRequest("/api/v1/admin/users?page=1"));
    const body = await readJson<typeof mockState.listedUsers>(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Admin-Action")).toBe("true");
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data).toHaveLength(1);
      expect(body.meta?.total).toBe(1);
    }
  });

  it("should return system analytics with the admin action header", async () => {
    const response = await getAnalytics();
    const body = await readJson<typeof mockState.stats>(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Admin-Action")).toBe("true");
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data.totalUsers).toBe(1);
    }
  });

  it("should return a user detail", async () => {
    const response = await getUser(createRequest("/api/v1/admin/users/user-1"), routeContext());
    const body = await readJson<typeof mockState.userDetail>(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Admin-Action")).toBe("true");
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data.email).toBe("user@example.com");
      expect(body.data.linkCount).toBe(3);
    }
  });

  it("should change a user plan and write an audit entry", async () => {
    const response = await updateUser(
      createRequest("/api/v1/admin/users/user-1", {
        body: JSON.stringify({ plan: "PRO" }),
        method: "PATCH",
      }),
      routeContext(),
    );
    const body = await readJson<{ plan: string; previousPlan: string }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.auditWrites).toContainEqual(
      expect.objectContaining({
        action: "user.plan.change",
        adminUserId: "admin-1",
        targetUserId: "user-1",
      }),
    );
  });

  it("should suspend and unsuspend users with audit entries", async () => {
    const suspendResponse = await suspendOrUnsuspendUser(
      createRequest("/api/v1/admin/users/user-1", {
        body: JSON.stringify({ action: "suspend" }),
        method: "POST",
      }),
      routeContext(),
    );
    const unsuspendResponse = await suspendOrUnsuspendUser(
      createRequest("/api/v1/admin/users/user-1", {
        body: JSON.stringify({ action: "unsuspend" }),
        method: "POST",
      }),
      routeContext(),
    );

    expect(suspendResponse.status).toBe(200);
    expect(unsuspendResponse.status).toBe(200);
    expect(mockState.auditWrites.map((entry) => entry.action)).toEqual([
      "user.suspend",
      "user.unsuspend",
    ]);
  });

  it("should list audit log entries", async () => {
    const response = await getAuditLog(createRequest("/api/v1/admin/audit-log"));
    const body = await readJson<Array<{ action: string }>>(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Admin-Action")).toBe("true");
    expect(body.success).toBe(true);
    if (body.success) {
      expect(body.data[0]?.action).toBe("user.plan.change");
    }
  });
});
