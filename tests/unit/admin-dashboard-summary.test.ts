import { describe, expect, it } from "vitest";
import {
  buildAdminDashboardCards,
  formatAdminMetricNumber,
  formatAdminRevenueIdr,
} from "../../src/lib/admin/dashboard-summary";

describe("admin dashboard summary", () => {
  it("should format compact metric numbers when values are large", () => {
    expect(formatAdminMetricNumber(999)).toBe("999");
    expect(formatAdminMetricNumber(12_500)).toBe("12.5K");
  });

  it("should format settled revenue as Indonesian rupiah", () => {
    expect(formatAdminRevenueIdr(250_000)).toBe("Rp250.000");
  });

  it("should build stat cards from system stats", () => {
    const cards = buildAdminDashboardCards({
      clicksLast30Days: 40,
      linksLast30Days: 3,
      settledRevenueIdr: 150_000,
      totalClicks: 120,
      totalLinks: 12,
      totalUsers: 8,
      usersLast30Days: 2,
    });

    expect(cards.map((card) => card.label)).toEqual([
      "Total Users",
      "Total Links",
      "Total Clicks",
      "Revenue (IDR)",
    ]);
    expect(cards[0]).toMatchObject({
      description: "2 new in 30 days",
      value: "8",
    });
    expect(cards[3]?.value).toBe("Rp150.000");
  });
});
