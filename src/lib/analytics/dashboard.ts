import {
  summarizeClickEvents,
  type AnalyticsDateRange,
  type CountMetric,
  type LinkAnalyticsSummary,
} from "@/lib/analytics/summary";
import type {
  ClickEventForAnalytics,
  DashboardAnalyticsAggregates,
  TopDashboardLink,
} from "@/lib/db/queries/click-events";
import { getPlanDefinition } from "@/lib/plans/definitions";
import type { UserPlan } from "@/lib/links/limits";
import type { DashboardAnalyticsQuery } from "@/lib/validations/analytics";

export type DashboardAnalyticsRangeKey = "7" | "30" | "90" | "custom";

export type DashboardAnalyticsRange = AnalyticsDateRange & {
  key: DashboardAnalyticsRangeKey;
  maxDays: number;
  retentionDays: number;
  retentionFrom: Date;
};

export type DashboardAnalyticsSummary = LinkAnalyticsSummary & {
  topLinks: TopDashboardLink[];
  uniqueVisitors: number;
};

export type DashboardAnalyticsData = {
  csv: string;
  range: DashboardAnalyticsRange;
  summary: DashboardAnalyticsSummary;
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
): AnalyticsDateRange & { key: DashboardAnalyticsRangeKey } {
  const to = now;
  const from = new Date(startOfUtcDay(to).getTime() - (days - 1) * DAY_MS);

  return { from, key, to };
}

function retentionStart(now: Date, retentionDays: number): Date {
  return new Date(startOfUtcDay(now).getTime() - (retentionDays - 1) * DAY_MS);
}

function rangeDays(range: AnalyticsDateRange): number {
  return Math.ceil(
    (endOfUtcDay(range.to).getTime() - startOfUtcDay(range.from).getTime() + 1) /
      DAY_MS,
  );
}

export function getDashboardAnalyticsRetentionDays(plan: UserPlan): number {
  return getPlanDefinition(plan).limits.analyticsRetentionDays;
}

export function normalizeDashboardAnalyticsRange(
  query: DashboardAnalyticsQuery,
  now = new Date(),
  options: { retentionDays?: number } = {},
): DashboardAnalyticsRange {
  const retentionDays =
    options.retentionDays ?? MAX_DASHBOARD_ANALYTICS_RANGE_DAYS;
  const maxDays = Math.min(
    retentionDays,
    MAX_DASHBOARD_ANALYTICS_RANGE_DAYS,
  );
  const retentionFrom = retentionStart(now, retentionDays);
  const normalized =
    query.range !== "custom"
      ? presetRange(Number(query.range), query.range, now)
      : (() => {
          if (!query.from || !query.to) {
            throw new DashboardAnalyticsRangeError(
              "Custom range requires from and to.",
            );
          }

          return {
            from: parseUtcDate(query.from),
            key: "custom" as const,
            to: endOfUtcDay(parseUtcDate(query.to)),
          };
        })();
  const { from, to } = normalized;

  if (from > to) {
    throw new DashboardAnalyticsRangeError("from must be before or equal to to.");
  }

  if (rangeDays({ from, to }) > maxDays) {
    throw new DashboardAnalyticsRangeError(
      `Analytics date range cannot exceed ${maxDays} days for your plan.`,
    );
  }

  if (from < retentionFrom) {
    throw new DashboardAnalyticsRangeError(
      `Analytics retention for your plan starts on ${retentionFrom
        .toISOString()
        .slice(0, 10)}.`,
    );
  }

  return {
    from,
    key: normalized.key,
    maxDays,
    retentionDays,
    retentionFrom,
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
  summary: DashboardAnalyticsSummary | LinkAnalyticsSummary,
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
    ...summary.topCities.map((item) =>
      csvRow(["cities", item.label, item.count]),
    ),
    ...summary.browserBreakdown.map((item) =>
      csvRow(["browsers", item.label, item.count]),
    ),
    ...("topLinks" in summary ? summary.topLinks : []).map((item) =>
      csvRow(["topLinks", item.slug, item.totalClicks]),
    ),
  ];

  return `${rows.join("\n")}\n`;
}

function buildEmptySummary(
  range: DashboardAnalyticsRange,
): DashboardAnalyticsSummary {
  return {
    ...summarizeClickEvents([], range),
    topLinks: [],
    uniqueVisitors: 0,
  };
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;

  return Number((numerator / denominator).toFixed(4));
}

function sortMetrics(metrics: CountMetric[], limit = 5): CountMetric[] {
  return [...metrics]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function normalizeMetricRows(rows: CountMetric[]): CountMetric[] {
  return sortMetrics(rows.map((row) => ({
    count: Number(row.count),
    label: row.label.trim() || "Unknown",
  })));
}

function buildSummaryFromAggregates(
  aggregates: DashboardAnalyticsAggregates,
  range: DashboardAnalyticsRange,
): DashboardAnalyticsSummary {
  const empty = buildEmptySummary(range);
  const summary = aggregates.summary;

  return {
    browserBreakdown: normalizeMetricRows(aggregates.browserBreakdown),
    clicksPerDay: empty.clicksPerDay.map((bucket) => {
      const item = aggregates.clicksPerDay.find((row) => row.date === bucket.date);

      return {
        date: bucket.date,
        totalClicks: Number(item?.totalClicks ?? 0),
      };
    }),
    deviceBreakdown: normalizeMetricRows(aggregates.deviceBreakdown),
    linkPageAnalytics: {
      ctaClickThroughRate: rate(summary.ctaClicks, summary.pageViews),
      ctaClicks: summary.ctaClicks,
      countdown: {
        ctaClickThroughRate: rate(
          summary.countdownCtaClicks,
          summary.countdownViews,
        ),
        ctaClicks: summary.countdownCtaClicks,
        views: summary.countdownViews,
      },
      directRedirects: summary.directRedirects,
      pageViews: summary.pageViews,
      withoutCountdown: {
        ctaClickThroughRate: rate(
          summary.withoutCountdownCtaClicks,
          summary.withoutCountdownViews,
        ),
        ctaClicks: summary.withoutCountdownCtaClicks,
        views: summary.withoutCountdownViews,
      },
    },
    topCities: normalizeMetricRows(aggregates.topCities),
    topCountries: normalizeMetricRows(aggregates.topCountries),
    topLinks: aggregates.topLinks,
    topReferrers: normalizeMetricRows(aggregates.topReferrers),
    totalClicks: summary.totalClicks,
    uniqueClicks: summary.uniqueVisitors,
    uniqueVisitors: summary.uniqueVisitors,
  };
}

export function buildDashboardAnalyticsData({
  aggregates,
  events,
  range,
}: {
  aggregates?: DashboardAnalyticsAggregates;
  events?: ClickEventForAnalytics[];
  range: DashboardAnalyticsRange;
}): DashboardAnalyticsData {
  const summary: DashboardAnalyticsSummary = aggregates
    ? buildSummaryFromAggregates(aggregates, range)
    : (() => {
        const eventSummary = summarizeClickEvents(events ?? [], range);

        return {
          ...eventSummary,
          topLinks: [],
          uniqueVisitors: eventSummary.uniqueClicks,
        };
      })();

  return {
    csv: buildDashboardAnalyticsCsv(summary, range),
    range,
    summary,
  };
}
