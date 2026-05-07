import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserNotificationPreferences } from "../../src/lib/db/schema";
import type { UserPlan } from "../../src/lib/links/limits";

type MockApiKey = {
  createdAt: Date;
  id: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  name: string;
};

const mockState = vi.hoisted(() => ({
  apiKeys: [] as MockApiKey[],
  billingUser: {
    email: "user@example.com",
    name: "User",
    plan: "FREE" as UserPlan,
  } as { email: string; name: string | null; plan: UserPlan } | null,
  settingsError: null as Error | null,
  settingsUser: {
    email: "user@example.com",
    name: "User",
    notifications: {
      linkPerformanceAlerts: true,
      paymentConfirmations: true,
      productUpdates: true,
      weeklyAnalyticsReport: true,
    } satisfies UserNotificationPreferences,
  } as {
    email: string;
    name: string | null;
    notifications: UserNotificationPreferences;
  } | null,
}));

vi.mock("@/lib/db/queries/api-keys", () => ({
  listApiKeysByUserId: async () => mockState.apiKeys,
}));

vi.mock("@/lib/db/queries/payments", () => ({
  findBillingUserById: async () => mockState.billingUser,
}));

vi.mock("@/lib/db/queries/settings", () => ({
  findSettingsUserById: async () => {
    if (mockState.settingsError) throw mockState.settingsError;
    return mockState.settingsUser;
  },
}));

import {
  canManageApiKeys,
  loadSettingsPageData,
} from "../../src/app/(dashboard)/settings/settings-page-data";

describe("settings page data", () => {
  beforeEach(() => {
    mockState.apiKeys = [];
    mockState.billingUser = {
      email: "user@example.com",
      name: "User",
      plan: "FREE",
    };
    mockState.settingsError = null;
    mockState.settingsUser = {
      email: "user@example.com",
      name: "User",
      notifications: {
        linkPerformanceAlerts: true,
        paymentConfirmations: true,
        productUpdates: true,
        weeklyAnalyticsReport: true,
      },
    };
  });

  it("should load settings data for free users without API keys", async () => {
    const data = await loadSettingsPageData("user-1");

    expect(data.status).toBe("ready");
    expect(data.plan).toBe("FREE");
    expect(data.apiKeys).toEqual([]);
  });

  it("should load API keys for paid users", async () => {
    mockState.billingUser = {
      email: "user@example.com",
      name: "User",
      plan: "PRO",
    };
    mockState.apiKeys = [
      {
        createdAt: new Date("2026-05-07T00:00:00Z"),
        id: "key-1",
        keyPrefix: "ls_live",
        lastUsedAt: null,
        name: "Production",
      },
    ];

    const data = await loadSettingsPageData("user-1");

    expect(data.status).toBe("ready");
    expect(data.plan).toBe("PRO");
    expect(data.apiKeys).toHaveLength(1);
  });

  it("should return inline error data when settings query fails", async () => {
    mockState.settingsError = new Error("database unavailable");

    const data = await loadSettingsPageData("user-1");

    expect(data).toMatchObject({
      apiKeys: [],
      plan: "FREE",
      settingsUser: null,
      status: "error",
    });
  });

  it("should identify paid API key access plans", () => {
    expect(canManageApiKeys("FREE")).toBe(false);
    expect(canManageApiKeys("PRO")).toBe(true);
    expect(canManageApiKeys("BUSINESS")).toBe(true);
  });
});
