import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
} from "drizzle-orm";
import {
  buildClickTrend,
  buildRecentLinks,
  buildTopCountries,
  getDashboardOverviewRange,
  QR_SCAN_REFERRER,
  type DashboardOverview,
} from "@/lib/dashboard/overview";
import { db } from "@/lib/db";
import { campaigns, clickEvents, links } from "@/lib/db/schema";

type GetDashboardOverviewInput = {
  now?: Date;
  userId: string;
};

const dashboardClickFilter = ({
  from,
  to,
  userId,
}: {
  from?: Date;
  to?: Date;
  userId: string;
}) => {
  const filters = [
    eq(links.userId, userId),
    ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
  ];

  if (from) filters.push(gte(clickEvents.timestamp, from));
  if (to) filters.push(lte(clickEvents.timestamp, to));

  return and(...filters);
};

function firstCount(rows: Array<{ value: number }>): number {
  return rows[0]?.value ?? 0;
}

export async function getDashboardOverviewByUserId({
  now = new Date(),
  userId,
}: GetDashboardOverviewInput): Promise<DashboardOverview> {
  const range = getDashboardOverviewRange(now);
  const clickDate = sql<string>`to_char(date_trunc('day', ${clickEvents.timestamp}), 'YYYY-MM-DD')`;

  const [
    activeCampaignRows,
    clickTrendRows,
    clicksTodayRows,
    qrScanRows,
    recentLinkRows,
    topCountryRows,
    totalLinkRows,
  ] = await Promise.all([
    db
      .select({ value: countDistinct(campaigns.id) })
      .from(campaigns)
      .innerJoin(
        links,
        and(eq(links.campaignId, campaigns.id), eq(links.isActive, true)),
      )
      .where(eq(campaigns.userId, userId)),
    db
      .select({
        clicks: count(),
        date: clickDate,
      })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(dashboardClickFilter({ from: range.from, to: range.to, userId }))
      .groupBy(clickDate),
    db
      .select({ value: count() })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(dashboardClickFilter({ from: range.todayStart, to: range.to, userId })),
    db
      .select({ value: count() })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(and(
        dashboardClickFilter({ userId }),
        eq(clickEvents.referrer, QR_SCAN_REFERRER),
      )),
    db
      .select({
        createdAt: links.createdAt,
        destinationUrl: links.destinationUrl,
        hasLinkPage: links.hasLinkPage,
        id: links.id,
        slug: links.slug,
        title: links.title,
      })
      .from(links)
      .where(eq(links.userId, userId))
      .orderBy(desc(links.createdAt))
      .limit(5),
    db
      .select({
        clicks: count(),
        country: clickEvents.country,
      })
      .from(clickEvents)
      .innerJoin(links, eq(clickEvents.linkId, links.id))
      .where(dashboardClickFilter({ from: range.from, to: range.to, userId }))
      .groupBy(clickEvents.country),
    db
      .select({ value: count() })
      .from(links)
      .where(eq(links.userId, userId)),
  ]);

  const linkIds = recentLinkRows.map((link) => link.id);
  const recentLinkClickRows =
    linkIds.length === 0
      ? []
      : await db
          .select({
            clicks: count(),
            linkId: clickEvents.linkId,
          })
          .from(clickEvents)
          .where(and(
            inArray(clickEvents.linkId, linkIds),
            ne(clickEvents.eventType, "LINK_PAGE_CTA_CLICK"),
          ))
          .groupBy(clickEvents.linkId);

  const clicksByLinkId = new Map(
    recentLinkClickRows.map((row) => [row.linkId, row.clicks]),
  );

  return {
    activeCampaigns: firstCount(activeCampaignRows),
    clickTrend: buildClickTrend(clickTrendRows, range),
    clicksToday: firstCount(clicksTodayRows),
    qrScans: firstCount(qrScanRows),
    recentLinks: buildRecentLinks(
      recentLinkRows.map((link) => ({
        ...link,
        clicks: clicksByLinkId.get(link.id) ?? 0,
      })),
      now,
    ),
    topCountries: buildTopCountries(topCountryRows),
    totalLinks: firstCount(totalLinkRows),
  };
}
