import { db } from "@/lib/db";
import { clickEvents } from "@/lib/db/schema";

export type NewClickEvent = typeof clickEvents.$inferInsert;

export async function insertClickEvents(events: NewClickEvent[]): Promise<void> {
  if (events.length === 0) return;

  await db.insert(clickEvents).values(events);
}
