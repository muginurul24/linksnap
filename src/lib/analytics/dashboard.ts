import {
  summarizeClickEvents,
  type AnalyticsDateRange,
  type LinkAnalyticsSummary,
} from "@/lib/analytics/summary";
import type { ClickEventForAnalytics } from "@/lib/db/queries/click-events";
import type { DashboardAnalyticsQuery } from "@/lib/validations/analytics";

export type DashboardAnalyticsRangeKey = "7" | "30" | "90" | "custom";

export type DashboardAnalyticsRange = AnalyticsDateRange & {
  key: DashboardAnalyticsRangeKey;
};

export type DashboardAnalyticsData = {
  csv: string;
  range: DashboardAnalyticsRange;
  summary: LinkAnalyticsSummary;
};

export class DashboardAnalyticsRangeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_DASHBOARD_ANALYTICS_RANGE_DAYS = 90;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function endOfUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + DAY_MS - 1);
}

function parseUtcDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new DashboardAnalyticsRangeError("Invalid analytics date.");
  }

  return date;
}

function presetRange(
  days: number,
  key: DashboardAnalyticsRangeKey,
  now: Date,
): DashboardAnalyticsRange {
  const to = now;
  const from = new Date(startOfUtcDay(to).getTime() - (days - 1) * DAY_MS);

  return { from, key, to };
}

export function normalizeDashboardAnalyticsRange(
  query: DashboardAnalyticsQuery,
  now = new Date(),
): DashboardAnalyticsRange {
  if (query.range !== "custom") {
    return presetRange(Number(query.range), query.range, now);
  }

  if (!query.from || !query.to) {
    throw new DashboardAnalyticsRangeError("Custom range requires from and to.");
  }

  const from = parseUtcDate(query.from);
  const to = endOfUtcDay(parseUtcDate(query.to));

  if (from > to) {
    throw new DashboardAnalyticsRangeError("from must be before or equal to to.");
  }

  if (to.getTime() - from.getTime() > MAX_DASHBOARD_ANALYTICS_RANGE_DAYS * DAY_MS) {
    throw new DashboardAnalyticsRangeError(
      "Analytics date range cannot exceed 90 days.",
    );
  }

  return {
    from,
    key: "custom",
    to,
  };
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;

  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function csvRow(values: Array<string | number>): string {
  return values.map(escapeCsvValue).join(",");
}

export function buildDashboardAnalyticsCsv(
  summary: LinkAnalyticsSummary,
  range: AnalyticsDateRange,
): string {
  const rows = [
    csvRow(["section", "label", "count"]),
    csvRow(["range", "from", range.from.toISOString()]),
    csvRow(["range", "to", range.to.toISOString()]),
    csvRow(["summary", "totalClicks", summary.totalClicks]),
    csvRow(["summary", "uniqueClicks", summary.uniqueClicks]),
    ...summary.clicksPerDay.map((item) =>
      csvRow(["dailyClicks", item.date, item.totalClicks]),
    ),
    ...summary.deviceBreakdown.map((item) =>
      csvRow(["devices", item.label, item.count]),
    ),
    ...summary.topReferrers.map((item) =>
      csvRow(["referrers", item.label, item.count]),
    ),
    ...summary.topCountries.map((item) =>
      csvRow(["countries", item.label, item.count]),
    ),
  ];

  return `${rows.join("\n")}\n`;
}

export function buildDashboardAnalyticsData({
  events,
  range,
}: {
  events: ClickEventForAnalytics[];
  range: DashboardAnalyticsRange;
}): DashboardAnalyticsData {
  const summary = summarizeClickEvents(events, range);

  return {
    csv: buildDashboardAnalyticsCsv(summary, range),
    range,
    summary,
  };
}
