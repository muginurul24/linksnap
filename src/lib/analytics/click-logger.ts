import { db } from "@/lib/db";
import { clickEvents } from "@/lib/db/schema";

type RedirectClickInput = {
  linkId: string;
  referrer: string | null;
  userAgent: string | null;
};

export async function logRedirectClick({
  linkId,
  referrer,
  userAgent,
}: RedirectClickInput): Promise<void> {
  try {
    await db.insert(clickEvents).values({
      linkId,
      referrer,
      userAgent,
    });
  } catch (error) {
    console.error("[click-logger] failed to log redirect click", error);
  }
}
