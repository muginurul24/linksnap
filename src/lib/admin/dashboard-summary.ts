import type { AdminSystemStats } from "@/lib/db/queries/admin";

export type AdminDashboardCard = {
  description: string;
  label: string;
  value: string;
};

export function formatAdminMetricNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    notation: value >= 10_000 ? "compact" : "standard",
  }).format(value);
}

export function formatAdminRevenueIdr(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    compactDisplay: "short",
    currency: "IDR",
    maximumFractionDigits: 1,
    notation: value >= 10_000_000 ? "compact" : "standard",
    style: "currency",
  }).format(value).replace(/\s+/gu, "");
}

export function buildAdminDashboardCards(
  stats: Pick<
    AdminSystemStats,
    | "clicksLast30Days"
    | "linksLast30Days"
    | "settledRevenueIdr"
    | "totalClicks"
    | "totalLinks"
    | "totalUsers"
    | "usersLast30Days"
  >,
): AdminDashboardCard[] {
  return [
    {
      description: `${formatAdminMetricNumber(stats.usersLast30Days)} new in 30 days`,
      label: "Total Users",
      value: formatAdminMetricNumber(stats.totalUsers),
    },
    {
      description: `${formatAdminMetricNumber(stats.linksLast30Days)} new in 30 days`,
      label: "Total Links",
      value: formatAdminMetricNumber(stats.totalLinks),
    },
    {
      description: `${formatAdminMetricNumber(stats.clicksLast30Days)} events in 30 days`,
      label: "Total Clicks",
      value: formatAdminMetricNumber(stats.totalClicks),
    },
    {
      description: "Settled payment revenue",
      label: "Revenue (IDR)",
      value: formatAdminRevenueIdr(stats.settledRevenueIdr),
    },
  ];
}
