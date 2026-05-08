import { findRedirectLinkBySlug } from "@/lib/db/queries/links";
import {
  fromRedirectLinkCachePayload,
  getRedirectCacheKey,
  REDIRECT_CACHE_TTL_SECONDS,
  toRedirectLinkCachePayload,
  type RedirectLink,
  type RedirectLinkCachePayload,
} from "@/lib/links/redirect";
import { cacheGet, cacheSet } from "@/lib/redis";

export async function getRedirectLink(slug: string): Promise<RedirectLink | null> {
  const cacheKey = getRedirectCacheKey(slug);
  const cached = await cacheGet<RedirectLinkCachePayload>(cacheKey);

  if (cached) return fromRedirectLinkCachePayload(cached);

  const link = await findRedirectLinkBySlug(slug);
  if (!link) return null;

  await cacheSet(
    cacheKey,
    toRedirectLinkCachePayload(link),
    REDIRECT_CACHE_TTL_SECONDS,
  );

  return link;
}
