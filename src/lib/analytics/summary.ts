import type { ClickEventForAnalytics } from "@/lib/db/queries/click-events";

export type AnalyticsDateRange = {
  from: Date;
  to: Date;
};

export type AnalyticsDateRangeInput = {
  from?: Date;
  to?: Date;
};

export type CountMetric = {
  count: number;
  label: string;
};

export type ClicksPerDayMetric = {
  date: string;
  totalClicks: number;
};

export type LinkAnalyticsSummary = {
  browserBreakdown: CountMetric[];
  clicksPerDay: ClicksPerDayMetric[];
  deviceBreakdown: CountMetric[];
  linkPageAnalytics: {
    ctaClickThroughRate: number;
    ctaClicks: number;
    countdown: {
      ctaClickThroughRate: number;
      ctaClicks: number;
      views: number;
    };
    directRedirects: number;
    pageViews: number;
    withoutCountdown: {
      ctaClickThroughRate: number;
      ctaClicks: number;
      views: number;
    };
  };
  topCities: CountMetric[];
  topCountries: CountMetric[];
  topReferrers: CountMetric[];
  totalClicks: number;
  uniqueClicks: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_ANALYTICS_RANGE_DAYS = 30;

export class AnalyticsDateRangeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function normalizeAnalyticsDateRange(
  input: AnalyticsDateRangeInput,
  now = new Date(),
): AnalyticsDateRange {
  const to = input.to ?? now;
  const from = input.from ?? new Date(startOfUtcDay(to).getTime() - 29 * DAY_MS);

  if (from > to) {
    throw new AnalyticsDateRangeError("from must be before or equal to to.");
  }

  if (to.getTime() - from.getTime() > MAX_ANALYTICS_RANGE_DAYS * DAY_MS) {
    throw new AnalyticsDateRangeError("Analytics date range cannot exceed 30 days.");
  }

  return { from, to };
}

function increment(map: Map<string, number>, label: string): void {
  map.set(label, (map.get(label) ?? 0) + 1);
}

function topMetrics(map: Map<string, number>, limit = 5): CountMetric[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function normalizeLabel(value: string | null, fallback = "Unknown"): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function buildDayBuckets(range: AnalyticsDateRange): Map<string, number> {
  const buckets = new Map<string, number>();
  const endDay = startOfUtcDay(range.to).getTime();

  for (
    let cursor = startOfUtcDay(range.from).getTime();
    cursor <= endDay;
    cursor += DAY_MS
  ) {
    buckets.set(formatUtcDate(new Date(cursor)), 0);
  }

  return buckets;
}

function rate(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;

  return Number((numerator / denominator).toFixed(4));
}

export function summarizeClickEvents(
  events: ClickEventForAnalytics[],
  range: AnalyticsDateRange,
): LinkAnalyticsSummary {
  const browserCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const dayCounts = buildDayBuckets(range);
  const deviceCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const uniqueIpHashes = new Set<string>();
  let countdownCtaClicks = 0;
  let countdownViews = 0;
  let ctaClicks = 0;
  let directRedirects = 0;
  let pageViews = 0;
  let withoutCountdownCtaClicks = 0;
  let withoutCountdownViews = 0;

  for (const event of events) {
    if (event.eventType === "LINK_PAGE_CTA_CLICK") {
      ctaClicks += 1;
      if (event.linkPageHasCountdown) {
        countdownCtaClicks += 1;
      } else {
        withoutCountdownCtaClicks += 1;
      }
      continue;
    }

    if (event.eventType === "LINK_PAGE_VIEW") {
      pageViews += 1;
      if (event.linkPageHasCountdown) {
        countdownViews += 1;
      } else {
        withoutCountdownViews += 1;
      }
    } else {
      directRedirects += 1;
    }

    if (event.ipHash) uniqueIpHashes.add(event.ipHash);

    increment(dayCounts, formatUtcDate(event.timestamp));
    increment(browserCounts, normalizeLabel(event.browser));
    increment(cityCounts, normalizeLabel(event.city));
    increment(countryCounts, normalizeLabel(event.country));
    increment(deviceCounts, normalizeLabel(event.device));
    increment(referrerCounts, normalizeLabel(event.referrer, "Direct"));
  }

  return {
    browserBreakdown: topMetrics(browserCounts),
    clicksPerDay: [...dayCounts.entries()].map(([date, totalClicks]) => ({
      date,
      totalClicks,
    })),
    deviceBreakdown: topMetrics(deviceCounts),
    linkPageAnalytics: {
      ctaClickThroughRate: rate(ctaClicks, pageViews),
      ctaClicks,
      countdown: {
        ctaClickThroughRate: rate(countdownCtaClicks, countdownViews),
        ctaClicks: countdownCtaClicks,
        views: countdownViews,
      },
      directRedirects,
      pageViews,
      withoutCountdown: {
        ctaClickThroughRate: rate(withoutCountdownCtaClicks, withoutCountdownViews),
        ctaClicks: withoutCountdownCtaClicks,
        views: withoutCountdownViews,
      },
    },
    topCities: topMetrics(cityCounts),
    topCountries: topMetrics(countryCounts),
    topReferrers: topMetrics(referrerCounts),
    totalClicks: directRedirects + pageViews,
    uniqueClicks: uniqueIpHashes.size,
  };
}
