import { db } from "@/lib/db";
import { clickEvents } from "@/lib/db/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export type NewClickEvent = typeof clickEvents.$inferInsert;

export type ClickEventForAnalytics = {
  browser: string | null;
  city: string | null;
  country: string | null;
  device: string | null;
  ipHash: string | null;
  referrer: string | null;
  timestamp: Date;
};

type ListClickEventsForLinkInput = {
  from: Date;
  linkId: string;
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
      ipHash: clickEvents.ipHash,
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
