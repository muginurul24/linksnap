import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserNotificationPreferences } from "../../src/lib/db/schema";
import type { UserPlan } from "../../src/lib/links/limits";

type MockSession = {
  user: {
    id: string;
  };
} | null;

type MockSettingsUser = {
  email: string;
  name: string | null;
  notifications: UserNotificationPreferences;
};

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

const USER_ID = "00000000-0000-4000-8000-000000000001";

const defaultNotifications: UserNotificationPreferences = {
  linkPerformanceAlerts: true,
  paymentConfirmations: true,
  productUpdates: true,
  weeklyAnalyticsReport: true,
};

const mockState = vi.hoisted(() => ({
  plan: "FREE" as UserPlan | null,
  rateLimitOptions: [] as RateLimitOptions[],
  rateLimitResult: { limited: false as const, remaining: 99 } as RateLimitResult,
  session: { user: { id: "00000000-0000-4000-8000-000000000001" } } as MockSession,
  user: {
    email: "user@example.com",
    name: "User",
    notifications: {
      linkPerformanceAlerts: true,
      paymentConfirmations: true,
      productUpdates: true,
      weeklyAnalyticsReport: true,
    },
  } as MockSettingsUser | null,
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => mockState.session,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () =>
    mockState.plan && mockState.user
      ? { email: mockState.user.email, name: mockState.user.name, plan: mockState.plan }
      : null,
}));

vi.mock("@/lib/redis/rate-limit", () => ({
  slidingWindowRateLimit: async (options: RateLimitOptions) => {
    mockState.rateLimitOptions.push(options);
    return mockState.rateLimitResult;
  },
}));

vi.mock("@/lib/db/queries/settings", () => ({
  updateSettingsUserNotifications: async ({
    notifications,
  }: {
    notifications: UserNotificationPreferences;
    userId: string;
  }) => {
    if (!mockState.user) return null;
    mockState.user.notifications = notifications;
    return notifications;
  },
  updateSettingsUserProfile: async ({
    name,
  }: {
    name: string | null;
    userId: string;
  }) => {
    if (!mockState.user) return null;
    mockState.user.name = name;
    return mockState.user;
  },
}));

import { PATCH as patchNotifications } from "../../src/app/api/v1/settings/notifications/route";
import { PATCH as patchProfile } from "../../src/app/api/v1/settings/profile/route";

function createJsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost:3000${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  }) as NextRequest;
}

async function readJson<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

describe("settings API", () => {
  beforeEach(() => {
    mockState.plan = "FREE";
    mockState.rateLimitOptions.length = 0;
    mockState.rateLimitResult = { limited: false, remaining: 99 };
    mockState.session = { user: { id: USER_ID } };
    mockState.user = {
      email: "user@example.com",
      name: "User",
      notifications: { ...defaultNotifications },
    };
  });

  it("should update the authenticated user's profile name", async () => {
    const response = await patchProfile(
      createJsonRequest("/api/v1/settings/profile", { name: "  Rafi  " }),
    );
    const body = await readJson<{ email: string; name: string | null }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data).toEqual({ email: "user@example.com", name: "Rafi" });
    expect(mockState.user?.name).toBe("Rafi");
  });

  it("should clear the profile name when blank", async () => {
    const response = await patchProfile(
      createJsonRequest("/api/v1/settings/profile", { name: "" }),
    );
    const body = await readJson<{ email: string; name: string | null }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.name).toBeNull();
  });

  it("should reject invalid profile input", async () => {
    const response = await patchProfile(
      createJsonRequest("/api/v1/settings/profile", {
        email: "attacker@example.com",
        name: "User",
      }),
    );
    const body = await readJson<{ email: string; name: string | null }>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should update notification preferences", async () => {
    const notifications: UserNotificationPreferences = {
      linkPerformanceAlerts: false,
      paymentConfirmations: true,
      productUpdates: false,
      weeklyAnalyticsReport: true,
    };

    const response = await patchNotifications(
      createJsonRequest("/api/v1/settings/notifications", notifications),
    );
    const body = await readJson<{
      notifications: UserNotificationPreferences;
    }>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    if (!body.success) return;
    expect(body.data.notifications).toEqual(notifications);
    expect(mockState.user?.notifications).toEqual(notifications);
  });

  it("should reject unauthenticated settings updates", async () => {
    mockState.session = null;

    const response = await patchProfile(
      createJsonRequest("/api/v1/settings/profile", { name: "User" }),
    );
    const body = await readJson<{ email: string; name: string | null }>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    if (body.success) return;
    expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
