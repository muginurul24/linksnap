import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("dashboard analytics contract wiring", () => {
  it("should use aggregate queries for dashboard analytics API and page data", () => {
    for (const file of [
      "src/app/api/v1/analytics/route.ts",
      "src/app/(dashboard)/analytics/page.tsx",
    ]) {
      const source = readSource(file);

      expect(source).toContain("getCachedDashboardAnalyticsAggregates");
      expect(source).not.toContain("listClickEventsForUser");
    }

    const cacheSource = readSource("src/lib/cache/analytics.ts");
    expect(cacheSource).toContain("getDashboardAnalyticsAggregatesForUser");
    expect(cacheSource).not.toContain("listClickEventsForUser");
  });

  it("should expose the final dashboard analytics contract fields", () => {
    const source = readSource("src/lib/analytics/dashboard.ts");

    for (const field of [
      "topLinks",
      "uniqueVisitors",
      "linkPageAnalytics",
      "deviceBreakdown",
      "browserBreakdown",
      "topReferrers",
      "topCountries",
      "topCities",
      "clicksPerDay",
      "retentionDays",
    ]) {
      expect(source).toContain(field);
    }
  });
});
