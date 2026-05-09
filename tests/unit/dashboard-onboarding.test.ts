import { describe, expect, it } from "vitest";
import {
  getDashboardOnboardingState,
} from "../../src/lib/dashboard/onboarding";
import type { DashboardOverview } from "../../src/lib/dashboard/overview";

function makeOverview(
  overrides: Partial<DashboardOverview> = {},
): DashboardOverview {
  return {
    activeCampaigns: 0,
    clickTrend: Array.from({ length: 7 }, (_, index) => ({
      clicks: 0,
      date: `2026-05-0${index + 1}`,
      label: `May ${index + 1}`,
    })),
    clicksToday: 0,
    qrScans: 0,
    recentLinks: [],
    topCountries: [],
    totalLinks: 0,
    ...overrides,
  };
}

describe("dashboard onboarding", () => {
  it("should show checklist when user has no links", () => {
    const state = getDashboardOnboardingState(makeOverview());

    expect(state.isNewUser).toBe(true);
    expect(state.showChecklist).toBe(true);
    expect(state.showShareCta).toBe(false);
    expect(state.steps.map((step) => step.completed)).toEqual([
      false,
      false,
      false,
    ]);
  });

  it("should show share CTA when user has links but no clicks", () => {
    const state = getDashboardOnboardingState(
      makeOverview({
        recentLinks: [
          {
            clicks: 0,
            createdAt: "2026-05-09T00:00:00.000Z",
            createdLabel: "just now",
            destinationUrl: "https://example.com",
            hasLinkPage: false,
            id: "link_1",
            slug: "first",
            title: null,
          },
        ],
        totalLinks: 1,
      }),
    );

    expect(state.showChecklist).toBe(false);
    expect(state.showShareCta).toBe(true);
    expect(state.firstLinkSlug).toBe("first");
  });

  it("should hide onboarding when user has links and clicks", () => {
    const state = getDashboardOnboardingState(
      makeOverview({
        clickTrend: [
          {
            clicks: 2,
            date: "2026-05-09",
            label: "May 9",
          },
        ],
        recentLinks: [
          {
            clicks: 2,
            createdAt: "2026-05-09T00:00:00.000Z",
            createdLabel: "just now",
            destinationUrl: "https://example.com",
            hasLinkPage: true,
            id: "link_1",
            slug: "first",
            title: null,
          },
        ],
        totalLinks: 1,
      }),
    );

    expect(state.hasAnyClicks).toBe(true);
    expect(state.showChecklist).toBe(false);
    expect(state.showShareCta).toBe(false);
  });
});
