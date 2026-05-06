import { describe, expect, it } from "vitest";
import {
  AnalyticsDateRangeError,
  normalizeAnalyticsDateRange,
  summarizeClickEvents,
  type AnalyticsDateRange,
} from "../../src/lib/analytics/summary";
import type { ClickEventForAnalytics } from "../../src/lib/db/queries/click-events";

function createClickEvent(
  overrides: Partial<ClickEventForAnalytics> = {},
): ClickEventForAnalytics {
  return {
    browser: "Chrome",
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    ipHash: "hash-1",
    referrer: "https://referrer.example",
    timestamp: new Date("2026-05-06T10:00:00.000Z"),
    ...overrides,
  };
}

describe("analytics summary", () => {
  it("should normalize default range to the last 30 UTC days", () => {
    const range = normalizeAnalyticsDateRange(
      {},
      new Date("2026-05-06T12:00:00.000Z"),
    );

    expect(range).toEqual({
      from: new Date("2026-04-07T00:00:00.000Z"),
      to: new Date("2026-05-06T12:00:00.000Z"),
    });
  });

  it("should reject ranges longer than 30 days", () => {
    expect(() =>
      normalizeAnalyticsDateRange({
        from: new Date("2026-04-01T00:00:00.000Z"),
        to: new Date("2026-05-06T00:00:00.000Z"),
      }),
    ).toThrow(AnalyticsDateRangeError);
  });

  it("should reject ranges where from is after to", () => {
    expect(() =>
      normalizeAnalyticsDateRange({
        from: new Date("2026-05-07T00:00:00.000Z"),
        to: new Date("2026-05-06T00:00:00.000Z"),
      }),
    ).toThrow(AnalyticsDateRangeError);
  });

  it("should summarize clicks by unique hash, day, referrer, location, device, and browser", () => {
    const range: AnalyticsDateRange = {
      from: new Date("2026-05-05T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.000Z"),
    };
    const events = [
      createClickEvent(),
      createClickEvent({
        browser: "Safari",
        city: "Bandung",
        country: "ID",
        device: "mobile",
        ipHash: "hash-2",
        referrer: null,
        timestamp: new Date("2026-05-06T11:00:00.000Z"),
      }),
      createClickEvent({
        browser: "Chrome",
        city: "Jakarta",
        country: "ID",
        device: "desktop",
        ipHash: "hash-1",
        referrer: "https://referrer.example",
        timestamp: new Date("2026-05-05T09:00:00.000Z"),
      }),
    ];

    expect(summarizeClickEvents(events, range)).toEqual({
      browserBreakdown: [
        { count: 2, label: "Chrome" },
        { count: 1, label: "Safari" },
      ],
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 2 },
      ],
      deviceBreakdown: [
        { count: 2, label: "desktop" },
        { count: 1, label: "mobile" },
      ],
      topCities: [
        { count: 2, label: "Jakarta" },
        { count: 1, label: "Bandung" },
      ],
      topCountries: [{ count: 3, label: "ID" }],
      topReferrers: [
        { count: 2, label: "https://referrer.example" },
        { count: 1, label: "Direct" },
      ],
      totalClicks: 3,
      uniqueClicks: 2,
    });
  });
});
