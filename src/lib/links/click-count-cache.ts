import {
  countRedirectClicksByLinkId,
  countRedirectClicksByLinkIds,
} from "@/lib/db/queries/click-events";
import { logger } from "@/lib/observability/logger";
import { redis } from "@/lib/redis";

export const REDIRECT_CLICK_COUNT_TTL_SECONDS = 60;

type LinkWithClickCount = {
  clickCount: number;
  id: string;
};

export function getRedirectClickCountCacheKey(linkId: string): string {
  return `linksnap:redirect-click-count:${linkId}`;
}

function parseRedisClickCount(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

async function readCachedRedirectClickCount(
  linkId: string,
): Promise<number | null> {
  try {
    const cached = await redis.get<number | string>(
      getRedirectClickCountCacheKey(linkId),
    );

    return parseRedisClickCount(cached);
  } catch (error) {
    logger.error("redirect_click_count_cache_read_failed", { error, linkId });
    return null;
  }
}

async function writeRedirectClickCount(
  linkId: string,
  clickCount: number,
): Promise<void> {
  try {
    await redis.set(getRedirectClickCountCacheKey(linkId), clickCount, {
      ex: REDIRECT_CLICK_COUNT_TTL_SECONDS,
    });
  } catch (error) {
    logger.error("redirect_click_count_cache_write_failed", { error, linkId });
  }
}

export function isRedirectClickCountedEvent(eventType: string): boolean {
  return eventType === "DIRECT_REDIRECT" || eventType === "LINK_PAGE_CTA_CLICK";
}

export async function getRedirectClickCount(linkId: string): Promise<number> {
  return getRedirectClickCountWithFallback({ linkId });
}

export async function getRedirectClickCountWithFallback({
  fallbackClickCount,
  linkId,
}: {
  fallbackClickCount?: number;
  linkId: string;
}): Promise<number> {
  const cached = await readCachedRedirectClickCount(linkId);
  if (cached !== null) return cached;

  const dbClickCount = applyFallbackClickCount(
    await countRedirectClicksByLinkId(linkId),
    fallbackClickCount,
  );
  await writeRedirectClickCount(linkId, dbClickCount);

  return dbClickCount;
}

function applyFallbackClickCount(
  dbClickCount: number,
  fallbackClickCount?: number,
): number {
  if (
    typeof fallbackClickCount !== "number" ||
    !Number.isSafeInteger(fallbackClickCount) ||
    fallbackClickCount < 0
  ) {
    return dbClickCount;
  }

  return Math.max(dbClickCount, fallbackClickCount);
}

export async function hydrateRedirectClickCounts<T extends LinkWithClickCount>(
  links: T[],
): Promise<T[]> {
  if (links.length === 0) return links;

  const uniqueLinkIds = [...new Set(links.map((link) => link.id))];
  const cachedEntries = await Promise.all(
    uniqueLinkIds.map(async (linkId) => ({
      clickCount: await readCachedRedirectClickCount(linkId),
      linkId,
    })),
  );
  const clickCountsByLinkId = new Map<string, number>();
  const missingLinkIds: string[] = [];

  for (const entry of cachedEntries) {
    if (entry.clickCount === null) {
      missingLinkIds.push(entry.linkId);
      continue;
    }

    clickCountsByLinkId.set(entry.linkId, entry.clickCount);
  }

  if (missingLinkIds.length > 0) {
    const dbCounts = await countRedirectClicksByLinkIds(missingLinkIds);
    const fallbackCountsByLinkId = new Map(
      links.map((link) => [link.id, link.clickCount]),
    );

    await Promise.all(
      missingLinkIds.map(async (linkId) => {
        const clickCount = applyFallbackClickCount(
          dbCounts.get(linkId) ?? 0,
          fallbackCountsByLinkId.get(linkId),
        );
        clickCountsByLinkId.set(linkId, clickCount);
        await writeRedirectClickCount(linkId, clickCount);
      }),
    );
  }

  return links.map((link) => ({
    ...link,
    clickCount: clickCountsByLinkId.get(link.id) ?? link.clickCount,
  }));
}

export async function incrementRedirectClickCount({
  currentClickCount,
  linkId,
}: {
  currentClickCount?: number;
  linkId: string;
}): Promise<number | null> {
  const key = getRedirectClickCountCacheKey(linkId);

  try {
    if (typeof currentClickCount === "number" && currentClickCount >= 0) {
      await redis.set(key, currentClickCount, {
        ex: REDIRECT_CLICK_COUNT_TTL_SECONDS,
        nx: true,
      });
    }

    const value = await redis.incr(key);
    await redis.expire(key, REDIRECT_CLICK_COUNT_TTL_SECONDS);

    return parseRedisClickCount(value);
  } catch (error) {
    logger.error("redirect_click_count_increment_failed", { error, linkId });
    return null;
  }
}
