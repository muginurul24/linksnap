import { db } from "@/lib/db";
import { clickEvents, links } from "@/lib/db/schema";
import { and, count, desc, eq, gte, inArray, lte, ne } from "drizzle-orm";

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
