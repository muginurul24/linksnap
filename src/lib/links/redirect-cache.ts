import { findRedirectLinkBySlug } from "@/lib/db/queries/links";
import { getRedirectClickCountWithFallback } from "@/lib/links/click-count-cache";
import {
  fromRedirectLinkCachePayload,
  getRedirectCacheKey,
  REDIRECT_CACHE_TTL_SECONDS,
  toRedirectLinkCachePayload,
  type RedirectLink,
  type RedirectLinkCachePayload,
  type RedirectLinkMetadata,
} from "@/lib/links/redirect";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function getRedirectLink(slug: string): Promise<RedirectLink | null> {
  const cacheKey = getRedirectCacheKey(slug);
  const cached = await cacheGet<RedirectLinkCachePayload>(cacheKey);

  const result = cached
    ? {
        fallbackClickCount: undefined,
        metadata: fromRedirectLinkCachePayload(cached),
      }
    : await getRedirectLinkMetadata(slug);

  if (!result) return null;

  return {
    ...result.metadata,
    clickCount: await getRedirectClickCountWithFallback({
      fallbackClickCount: result.fallbackClickCount,
      linkId: result.metadata.id,
    }),
  };
}

async function getRedirectLinkMetadata(
  slug: string,
): Promise<{
  fallbackClickCount: number;
  metadata: RedirectLinkMetadata;
} | null> {
  const link = await findRedirectLinkBySlug(slug);
  if (!link) return null;

  await cacheSet(
    getRedirectCacheKey(slug),
    toRedirectLinkCachePayload(link),
    REDIRECT_CACHE_TTL_SECONDS,
  );

  return { fallbackClickCount: link.clickCount, metadata: link };
}
