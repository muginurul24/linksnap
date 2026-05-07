import { describe, expect, it } from "vitest";
import {
  buildClickTrend,
  buildRecentLinks,
  buildTopCountries,
  formatRelativeCreatedAt,
  getDashboardOverviewRange,
} from "../../src/lib/dashboard/overview";

describe("dashboard overview data transforms", () => {
  it("should build a seven day UTC range ending today", () => {
    const range = getDashboardOverviewRange(
      new Date("2026-05-07T13:45:00.000Z"),
    );

    expect(range).toEqual({
      from: new Date("2026-05-01T00:00:00.000Z"),
      todayStart: new Date("2026-05-07T00:00:00.000Z"),
      to: new Date("2026-05-07T13:45:00.000Z"),
    });
  });

  it("should fill missing click trend days with zeroes", () => {
    const range = getDashboardOverviewRange(
      new Date("2026-05-07T13:45:00.000Z"),
    );

    expect(buildClickTrend([
      { clicks: 4, date: "2026-05-01" },
      { clicks: 7, date: "2026-05-03" },
      { clicks: 2, date: "2026-05-03" },
      { clicks: 9, date: "2026-05-07" },
    ], range)).toEqual([
      { clicks: 4, date: "2026-05-01", label: "May 1" },
      { clicks: 0, date: "2026-05-02", label: "May 2" },
      { clicks: 9, date: "2026-05-03", label: "May 3" },
      { clicks: 0, date: "2026-05-04", label: "May 4" },
      { clicks: 0, date: "2026-05-05", label: "May 5" },
      { clicks: 0, date: "2026-05-06", label: "May 6" },
      { clicks: 9, date: "2026-05-07", label: "May 7" },
    ]);
  });

  it("should combine and sort top countries with an unknown fallback", () => {
    expect(buildTopCountries([
      { clicks: 3, country: "ID" },
      { clicks: 2, country: "" },
      { clicks: 4, country: null },
      { clicks: 5, country: "MY" },
      { clicks: 5, country: "SG" },
    ], 3)).toEqual([
      { clicks: 6, country: "Unknown" },
      { clicks: 5, country: "MY" },
      { clicks: 5, country: "SG" },
    ]);
  });

  it("should format recent link timestamps relative to now", () => {
    const now = new Date("2026-05-07T13:45:00.000Z");

    expect(formatRelativeCreatedAt(
      new Date("2026-05-07T13:44:30.000Z"),
      now,
    )).toBe("just now");
    expect(formatRelativeCreatedAt(
      new Date("2026-05-07T11:45:00.000Z"),
      now,
    )).toBe("2 hours ago");

    expect(buildRecentLinks([
      {
        clicks: 12,
        createdAt: new Date("2026-05-06T13:45:00.000Z"),
        destinationUrl: "https://example.com",
        hasLinkPage: true,
        id: "link-1",
        slug: "promo",
        title: "Promo",
      },
    ], now)).toEqual([
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
    ]);
  });
});
