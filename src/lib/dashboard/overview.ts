const DAY_MS = 24 * 60 * 60 * 1000;

export const DASHBOARD_OVERVIEW_DAYS = 7;
export const QR_SCAN_REFERRER = "qr";

const chartDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

type PluralUnit = "day" | "hour" | "minute" | "month" | "week" | "year";

export type DashboardOverviewRange = {
  from: Date;
  todayStart: Date;
  to: Date;
};

export type DashboardClickTrendRow = {
  clicks: number;
  date: string;
};

export type DashboardClickTrendPoint = DashboardClickTrendRow & {
  label: string;
};

export type DashboardTopCountryRow = {
  clicks: number;
  country: string | null;
};

export type DashboardTopCountry = {
  clicks: number;
  country: string;
};

export type DashboardRecentLinkRow = {
  clicks: number;
  createdAt: Date;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  slug: string;
  title: string | null;
};

export type DashboardRecentLink = Omit<
  DashboardRecentLinkRow,
  "createdAt"
> & {
  createdAt: string;
  createdLabel: string;
};

export type DashboardOverview = {
  activeCampaigns: number;
  clickTrend: DashboardClickTrendPoint[];
  clicksToday: number;
  qrScans: number;
  recentLinks: DashboardRecentLink[];
  topCountries: DashboardTopCountry[];
  totalLinks: number;
};

function pluralize(value: number, unit: PluralUnit): string {
  return `${value} ${unit}${value === 1 ? "" : "s"} ago`;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function formatDashboardDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDashboardDateLabel(dateKey: string): string {
  return chartDateFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function getDashboardOverviewRange(
  now = new Date(),
): DashboardOverviewRange {
  const todayStart = startOfUtcDay(now);

  return {
    from: addUtcDays(todayStart, -(DASHBOARD_OVERVIEW_DAYS - 1)),
    todayStart,
    to: now,
  };
}

export function buildClickTrend(
  rows: DashboardClickTrendRow[],
  range: DashboardOverviewRange,
): DashboardClickTrendPoint[] {
  const clicksByDate = new Map<string, number>();

  for (const row of rows) {
    clicksByDate.set(row.date, (clicksByDate.get(row.date) ?? 0) + row.clicks);
  }

  return Array.from({ length: DASHBOARD_OVERVIEW_DAYS }, (_, index) => {
    const date = formatDashboardDateKey(addUtcDays(range.from, index));

    return {
      clicks: clicksByDate.get(date) ?? 0,
      date,
      label: formatDashboardDateLabel(date),
    };
  });
}

function normalizeCountry(country: string | null): string {
  return country?.trim() || "Unknown";
}

export function buildTopCountries(
  rows: DashboardTopCountryRow[],
  limit = 5,
): DashboardTopCountry[] {
  const clicksByCountry = new Map<string, number>();

  for (const row of rows) {
    const country = normalizeCountry(row.country);
    clicksByCountry.set(country, (clicksByCountry.get(country) ?? 0) + row.clicks);
  }

  return [...clicksByCountry.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([country, clicks]) => ({ country, clicks }));
}

export function formatRelativeCreatedAt(createdAt: Date, now = new Date()): string {
  const elapsedMs = Math.max(0, now.getTime() - createdAt.getTime());
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));

  if (elapsedMinutes < 1) return "just now";
  if (elapsedMinutes < 60) return pluralize(elapsedMinutes, "minute");

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return pluralize(elapsedHours, "hour");

  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return pluralize(elapsedDays, "day");

  const elapsedWeeks = Math.floor(elapsedDays / 7);
  if (elapsedWeeks < 5) return pluralize(elapsedWeeks, "week");

  const elapsedMonths = Math.floor(elapsedDays / 30);
  if (elapsedMonths < 12) return pluralize(elapsedMonths, "month");

  return pluralize(Math.max(1, Math.floor(elapsedDays / 365)), "year");
}

export function buildRecentLinks(
  rows: DashboardRecentLinkRow[],
  now = new Date(),
): DashboardRecentLink[] {
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    createdLabel: formatRelativeCreatedAt(row.createdAt, now),
  }));
}
