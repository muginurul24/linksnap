import { describe, expect, it } from "vitest";
import {
  DashboardAnalyticsRangeError,
  buildDashboardAnalyticsData,
  buildDashboardAnalyticsCsv,
  normalizeDashboardAnalyticsRange,
} from "../../src/lib/analytics/dashboard";
import type { AnalyticsDateRange } from "../../src/lib/analytics/summary";
import type {
  ClickEventForAnalytics,
  DashboardAnalyticsAggregates,
} from "../../src/lib/db/queries/click-events";

function createClickEvent(
  overrides: Partial<ClickEventForAnalytics> = {},
): ClickEventForAnalytics {
  return {
    browser: "Chrome",
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    eventType: "DIRECT_REDIRECT",
    ipHash: "hash-1",
    linkPageHasCountdown: false,
    referrer: "https://referrer.example",
    timestamp: new Date("2026-05-06T10:00:00.000Z"),
    ...overrides,
  };
}

describe("dashboard analytics", () => {
  it("should normalize preset ranges up to 90 days", () => {
    const now = new Date("2026-05-06T12:00:00.000Z");

    expect(normalizeDashboardAnalyticsRange({ range: "7" }, now)).toMatchObject({
      from: new Date("2026-04-30T00:00:00.000Z"),
      key: "7",
      maxDays: 90,
      retentionDays: 90,
      to: now,
    });
    expect(normalizeDashboardAnalyticsRange({ range: "90" }, now)).toMatchObject({
      from: new Date("2026-02-06T00:00:00.000Z"),
      key: "90",
      to: now,
    });
  });

  it("should normalize custom day bounds and reject long ranges", () => {
    expect(
      normalizeDashboardAnalyticsRange({
        from: "2026-05-01",
        range: "custom",
        to: "2026-05-06",
      }),
    ).toMatchObject({
      from: new Date("2026-05-01T00:00:00.000Z"),
      key: "custom",
      to: new Date("2026-05-06T23:59:59.999Z"),
    });

    expect(() =>
      normalizeDashboardAnalyticsRange({
        from: "2026-01-01",
        range: "custom",
        to: "2026-05-06",
      }),
    ).toThrow(DashboardAnalyticsRangeError);
  });

  it("should enforce plan retention limits", () => {
    const now = new Date("2026-05-06T12:00:00.000Z");

    expect(() =>
      normalizeDashboardAnalyticsRange({ range: "90" }, now, {
        retentionDays: 30,
      }),
    ).toThrow("cannot exceed 30 days");

    expect(() =>
      normalizeDashboardAnalyticsRange(
        {
          from: "2026-03-01",
          range: "custom",
          to: "2026-03-10",
        },
        now,
        { retentionDays: 30 },
      ),
    ).toThrow("retention for your plan starts");
  });

  it("should aggregate dashboard events and build CSV export", () => {
    const range = normalizeDashboardAnalyticsRange({
      from: "2026-05-05",
      range: "custom",
      to: "2026-05-06",
    });
    const analytics = buildDashboardAnalyticsData({
      events: [
        createClickEvent(),
        createClickEvent({
          country: "US",
          device: "mobile",
          ipHash: "hash-2",
          referrer: null,
          timestamp: new Date("2026-05-05T10:00:00.000Z"),
        }),
      ],
      range,
    });

    expect(analytics.summary).toMatchObject({
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 1 },
      ],
      deviceBreakdown: [
        { count: 1, label: "desktop" },
        { count: 1, label: "mobile" },
      ],
      topCountries: [
        { count: 1, label: "ID" },
        { count: 1, label: "US" },
      ],
      totalClicks: 2,
      uniqueClicks: 2,
    });
    expect(analytics.csv).toContain("dailyClicks,2026-05-05,1");
    expect(analytics.csv).toContain("countries,US,1");
  });

  it("should build stable empty aggregate analytics", () => {
    const range = normalizeDashboardAnalyticsRange({
      from: "2026-05-05",
      range: "custom",
      to: "2026-05-06",
    });
    const analytics = buildDashboardAnalyticsData({
      aggregates: {
        browserBreakdown: [],
        clicksPerDay: [],
        deviceBreakdown: [],
        summary: {
          countdownCtaClicks: 0,
          countdownViews: 0,
          ctaClicks: 0,
          directRedirects: 0,
          pageViews: 0,
          totalClicks: 0,
          uniqueVisitors: 0,
          withoutCountdownCtaClicks: 0,
          withoutCountdownViews: 0,
        },
        topCities: [],
        topCountries: [],
        topLinks: [],
        topReferrers: [],
      },
      range,
    });

    expect(analytics.summary).toMatchObject({
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 0 },
        { date: "2026-05-06", totalClicks: 0 },
      ],
      topLinks: [],
      totalClicks: 0,
      uniqueVisitors: 0,
    });
  });

  it("should build high-volume aggregate analytics without raw event rows", () => {
    const range = normalizeDashboardAnalyticsRange({
      from: "2026-05-05",
      range: "custom",
      to: "2026-05-06",
    });
    const aggregates: DashboardAnalyticsAggregates = {
      browserBreakdown: [{ count: 12_000, label: "Chrome" }],
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 30_000 },
        { date: "2026-05-06", totalClicks: 20_000 },
      ],
      deviceBreakdown: [{ count: 50_000, label: "mobile" }],
      summary: {
        countdownCtaClicks: 1_000,
        countdownViews: 5_000,
        ctaClicks: 4_000,
        directRedirects: 30_000,
        pageViews: 20_000,
        totalClicks: 50_000,
        uniqueVisitors: 18_000,
        withoutCountdownCtaClicks: 3_000,
        withoutCountdownViews: 15_000,
      },
      topCities: [{ count: 7_000, label: "Jakarta" }],
      topCountries: [{ count: 10_000, label: "ID" }],
      topLinks: [
        {
          destinationUrl: "https://example.com",
          id: "link-1",
          slug: "promo",
          title: "Promo",
          totalClicks: 25_000,
        },
      ],
      topReferrers: [{ count: 9_000, label: "Direct" }],
    };

    const analytics = buildDashboardAnalyticsData({ aggregates, range });

    expect(analytics.summary).toMatchObject({
      linkPageAnalytics: {
        ctaClickThroughRate: 0.2,
        ctaClicks: 4_000,
        directRedirects: 30_000,
        pageViews: 20_000,
      },
      topLinks: [{ slug: "promo", totalClicks: 25_000 }],
      totalClicks: 50_000,
      uniqueVisitors: 18_000,
    });
    expect(analytics.csv).toContain("topLinks,promo,25000");
  });

  it("should escape CSV values", () => {
    const range: AnalyticsDateRange = {
      from: new Date("2026-05-06T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.999Z"),
    };

    expect(
      buildDashboardAnalyticsCsv(
        {
          browserBreakdown: [],
          clicksPerDay: [],
          deviceBreakdown: [],
          linkPageAnalytics: {
            ctaClickThroughRate: 0,
            ctaClicks: 0,
            countdown: { ctaClickThroughRate: 0, ctaClicks: 0, views: 0 },
            directRedirects: 0,
            pageViews: 0,
            withoutCountdown: { ctaClickThroughRate: 0, ctaClicks: 0, views: 0 },
          },
          topCities: [],
          topCountries: [],
          topReferrers: [{ count: 2, label: "news, \"quoted\"" }],
          totalClicks: 0,
          uniqueClicks: 0,
        },
        range,
      ),
    ).toContain("referrers,\"news, \"\"quoted\"\"\",2");
  });
});
