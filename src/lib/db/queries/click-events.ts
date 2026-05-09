import { db } from "@/lib/db";
import { retryTransientDbQuery } from "@/lib/db/retry";
import { clickEvents, links } from "@/lib/db/schema";
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import type { ClicksPerDayMetric, CountMetric } from "@/lib/analytics/summary";

export type NewClickEvent = typeof clickEvents.$inferInsert;

export type ClickEventForAnalytics = {
  browser: string | null;
  city: string | null;
  country: string | null;
  device: string | null;
  eventType: typeof clickEvents.$inferSelect["eventType"];
  ipHash: string | null;
  linkPageHasCountdown: boolean;
  referrer: string | null;
  timestamp: Date;
};

export type CampaignClickEventForAnalytics = ClickEventForAnalytics & {
  campaignId: string;
};

export type TopCampaignLink = {
  destinationUrl: string;
  id: string;
  slug: string;
  title: string | null;
  totalClicks: number;
};

export type TopDashboardLink = TopCampaignLink;

export type DashboardAnalyticsAggregateSummary = {
  countdownCtaClicks: number;
  countdownViews: number;
  ctaClicks: number;
  directRedirects: number;
  pageViews: number;
  totalClicks: number;
  uniqueVisitors: number;
  withoutCountdownCtaClicks: number;
  withoutCountdownViews: number;
};

export type DashboardAnalyticsAggregates = {
  browserBreakdown: CountMetric[];
  clicksPerDay: ClicksPerDayMetric[];
  deviceBreakdown: CountMetric[];
  summary: DashboardAnalyticsAggregateSummary;
  topCities: CountMetric[];
  topCountries: CountMetric[];
  topLinks: TopDashboardLink[];
  topReferrers: CountMetric[];
};

const REDIRECT_CLICK_COUNT_EVENT_TYPES = [
  "DIRECT_REDIRECT",
  "LINK_PAGE_CTA_CLICK",
] as const;

type ListClickEventsForLinkInput = {
  from: Date;
  linkId: string;
  to: Date;
};

type ListClickEventsForCampaignsInput = {
  campaignIds: string[];
  from: Date;
  to: Date;
};

type ListClickEventsForUserInput = {
  from: Date;
  to: Date;
  userId: string;
};

type GetDashboardAnalyticsAggregatesInput = ListClickEventsForUserInput & {
  limit?: number;
};

type ListTopLinksForCampaignInput = {
  campaignId: string;
  from: Date;
  limit?: number;
  to: Date;
};

export async function insertClickEvents(events: NewClickEvent[]): Promise<void> {
  if (events.length === 0) return;

  await db.insert(clickEvents).values(events);
}

export async function countRedirectClicksByLinkId(linkId: string): Promise<number> {
  const counts = await countRedirectClicksByLinkIds([linkId]);

  return counts.get(linkId) ?? 0;
}

export async function countRedirectClicksByLinkIds(
  linkIds: string[],
): Promise<Map<string, number>> {
  const uniqueLinkIds = [...new Set(linkIds)];
  if (uniqueLinkIds.length === 0) return new Map();

  const rows = await retryTransientDbQuery(() =>
    db
      .select({
        linkId: clickEvents.linkId,
        value: count(),
      })
      .from(clickEvents)
      .where(and(
        inArray(clickEvents.linkId, uniqueLinkIds),
        inArray(clickEvents.eventType, REDIRECT_CLICK_COUNT_EVENT_TYPES),
      ))
      .groupBy(clickEvents.linkId),
  );

  return new Map(rows.map((row) => [row.linkId, Number(row.value)]));
}

export async function listClickEventsForLink({
  from,
  linkId,
  to,
}: ListClickEventsForLinkInput): Promise<ClickEventForAnalytics[]> {
  return db
    .select({
      browser: clickEvents.browser,
      city: clickEvents.city,
      country: clickEvents.country,
      device: clickEvents.device,
      eventType: clickEvents.eventType,
      ipHash: clickEvents.ipHash,
      linkPageHasCountdown: clickEvents.linkPageHasCountdown,
      referrer: clickEvents.referrer,
      timestamp: clickEvents.timestamp,
    })
    .from(clickEvents)
    .where(and(
      eq(clickEvents.linkId, linkId),
      gte(clickEvents.timestamp, from),
      lte(clickEvents.timestamp, to),
    ))
    .orderBy(desc(clickEvents.timestamp));
}

export async function listClickEventsForCampaigns({
  campaignIds,
  from,
  to,
}: ListClickEventsForCampaignsInput): Promise<CampaignClickEventForAnalytics[]> {
  if (campaignIds.length === 0) return [];

  const rows = await db
    .select({
      browser: clickEvents.browser,
      campaignId: links.campaignId,
      city: clickEvents.city,
      country: clickEvents.country,
      device: clickEvents.device,
      eventType: clickEvents.eventType,
      ipHash: clickEvents.ipHash,
      linkPageHasCountdown: clickEvents.linkPageHasCountdown,
      referrer: clickEvents.referrer,
      timestamp: clickEvents.timestamp,
    })
    .from(clickEvents)
    .innerJoin(links, eq(clickEvents.linkId, links.id))
    .where(and(
      inArray(links.campaignId, campaignIds),
      gte(clickEvents.timestamp, from),
      lte(clickEvents.timestamp, to),
    ))
    .orderBy(desc(clickEvents.timestamp));

  return rows.flatMap((row) => {
    if (!row.campaignId) return [];

    return [{ ...row, campaignId: row.campaignId }];
  });
}

export async function listClickEventsForUser({
  from,
  to,
  userId,
}: ListClickEventsForUserInput): Promise<ClickEventForAnalytics[]> {
  return db
    .select({
      browser: clickEvents.browser,
      city: clickEvents.city,
      country: clickEvents.country,
      device: clickEvents.device,
      eventType: clickEvents.eventType,
      ipHash: clickEvents.ipHash,
      linkPageHasCountdown: clickEvents.linkPageHasCountdown,
      referrer: clickEvents.referrer,
      timestamp: clickEvents.timestamp,
    })
    .from(clickEvents)
    .innerJoin(links, eq(clickEvents.linkId, links.id))
    .where(and(
      eq(links.userId, userId),
      gte(clickEvents.timestamp, from),
      lte(clickEvents.timestamp, to),
    ))
    .orderBy(desc(clickEvents.timestamp));
}

function dashboardAnalyticsFilter({
  from,
  to,
  userId,
}: ListClickEventsForUserInput) {
  return and(
    eq(links.userId, userId),
    gte(clickEvents.timestamp, from),
    lte(clickEvents.timestamp, to),
  );
}

function nonCtaDashboardAnalyticsFilter(input: ListClickEventsForUserInput) {
  return and(
    dashboardAnalyticsFilter(input),
    ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
  );
}

function countWhere(
  condition: ReturnType<typeof sql>,
): ReturnType<typeof sql<number>> {
  return sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
}

function firstAggregateSummary(
  rows: DashboardAnalyticsAggregateSummary[],
): DashboardAnalyticsAggregateSummary {
  return rows[0] ?? {
    countdownCtaClicks: 0,
    countdownViews: 0,
    ctaClicks: 0,
    directRedirects: 0,
    pageViews: 0,
    totalClicks: 0,
    uniqueVisitors: 0,
    withoutCountdownCtaClicks: 0,
    withoutCountdownViews: 0,
  };
}

function normalizeCountRows(
  rows: Array<{ count: number; label: string | null }>,
  fallback: string,
): CountMetric[] {
  return rows.map((row) => ({
    count: Number(row.count),
    label: row.label?.trim() || fallback,
  }));
}

export async function getDashboardAnalyticsAggregatesForUser({
  from,
  limit = 5,
  to,
  userId,
}: GetDashboardAnalyticsAggregatesInput): Promise<DashboardAnalyticsAggregates> {
  const input = { from, to, userId };
  const clickDate = sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;
  const totalClicks = countWhere(
    sql`${clickEvents.eventType} <> 'LINK_PAGE_CTA_CLICK'`,
  );
  const directRedirects = countWhere(
    sql`${clickEvents.eventType} = 'DIRECT_REDIRECT'`,
  );
  const pageViews = countWhere(sql`${clickEvents.eventType} = 'LINK_PAGE_VIEW'`);
  const ctaClicks = countWhere(
    sql`${clickEvents.eventType} = 'LINK_PAGE_CTA_CLICK'`,
  );
  const countdownViews = countWhere(
    sql`${clickEvents.eventType} = 'LINK_PAGE_VIEW' AND ${clickEvents.linkPageHasCountdown} = true`,
  );
  const countdownCtaClicks = countWhere(
    sql`${clickEvents.eventType} = 'LINK_PAGE_CTA_CLICK' AND ${clickEvents.linkPageHasCountdown} = true`,
  );
  const withoutCountdownViews = countWhere(
    sql`${clickEvents.eventType} = 'LINK_PAGE_VIEW' AND ${clickEvents.linkPageHasCountdown} = false`,
  );
  const withoutCountdownCtaClicks = countWhere(
    sql`${clickEvents.eventType} = 'LINK_PAGE_CTA_CLICK' AND ${clickEvents.linkPageHasCountdown} = false`,
  );
  const uniqueVisitors = sql<number>`
    count(distinct ${clickEvents.ipHash})
    filter (
      where ${clickEvents.eventType} <> 'LINK_PAGE_CTA_CLICK'
      and ${clickEvents.ipHash} is not null
    )
  `.mapWith(Number);
  const topLinkClicks = count();

  const [
    browserRows,
    cityRows,
    countryRows,
    dailyRows,
    deviceRows,
    referrerRows,
    summaryRows,
    topLinkRows,
  ] = await Promise.all([
    db
      .select({ count: count(), label: clickEvents.browser })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(clickEvents.browser)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({ count: count(), label: clickEvents.city })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(clickEvents.city)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({ count: count(), label: clickEvents.country })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(clickEvents.country)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({
        ctaClicks,
        date: clickDate,
        directRedirects,
        pageViews,
        totalClicks,
      })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(dashboardAnalyticsFilter(input))
      .groupBy(clickDate)
      .orderBy(clickDate),
    db
      .select({ count: count(), label: clickEvents.device })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(clickEvents.device)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({ count: count(), label: clickEvents.referrer })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(clickEvents.referrer)
      .orderBy(desc(count()))
      .limit(limit),
    db
      .select({
        countdownCtaClicks,
        countdownViews,
        ctaClicks,
        directRedirects,
        pageViews,
        totalClicks,
        uniqueVisitors,
        withoutCountdownCtaClicks,
        withoutCountdownViews,
      })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(dashboardAnalyticsFilter(input)),
    db
      .select({
        destinationUrl: links.destinationUrl,
        id: links.id,
        slug: links.slug,
        title: links.title,
        totalClicks: topLinkClicks,
      })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(nonCtaDashboardAnalyticsFilter(input))
      .groupBy(links.id, links.slug, links.title, links.destinationUrl)
      .orderBy(desc(topLinkClicks))
      .limit(limit),
  ]);

  return {
    browserBreakdown: normalizeCountRows(browserRows, "Unknown"),
    clicksPerDay: dailyRows.map((row) => ({
      date: row.date,
      totalClicks: Number(row.totalClicks),
    })),
    deviceBreakdown: normalizeCountRows(deviceRows, "Unknown"),
    summary: firstAggregateSummary(summaryRows.map((row) => ({
      ...row,
      uniqueVisitors: Number(row.uniqueVisitors),
    }))),
    topCities: normalizeCountRows(cityRows, "Unknown"),
    topCountries: normalizeCountRows(countryRows, "Unknown"),
    topLinks: topLinkRows.map((row) => ({
      ...row,
      totalClicks: Number(row.totalClicks),
    })),
    topReferrers: normalizeCountRows(referrerRows, "Direct"),
  };
}

export async function listTopLinksForCampaign({
  campaignId,
  from,
  limit = 5,
  to,
}: ListTopLinksForCampaignInput): Promise<TopCampaignLink[]> {
  const totalClicks = count();

  return db
    .select({
      destinationUrl: links.destinationUrl,
      id: links.id,
      slug: links.slug,
      title: links.title,
      totalClicks,
    })
    .from(clickEvents)
    .innerJoin(links, eq(clickEvents.linkId, links.id))
    .where(and(
      eq(links.campaignId, campaignId),
      gte(clickEvents.timestamp, from),
      lte(clickEvents.timestamp, to),
      ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
    ))
    .groupBy(links.id, links.slug, links.title, links.destinationUrl)
    .orderBy(desc(totalClicks))
    .limit(limit);
}
