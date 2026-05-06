import { after } from "next/server";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { LinkPageRenderer } from "@/components/link-page/link-page-renderer";
import {
  buildRedirectClickInput,
  logRedirectClick,
  type RedirectClickInput,
} from "@/lib/analytics/click-logger";
import {
  findPublicLinkPageByLinkId,
  findRedirectLinkBySlug,
} from "@/lib/db/queries/links";
import { buildShortUrlPreview } from "@/lib/links/preview";
import {
  fromRedirectLinkCachePayload,
  getRedirectCacheKey,
  isPublicSlug,
  isRedirectLinkAvailable,
  REDIRECT_CACHE_TTL_SECONDS,
  toRedirectLinkCachePayload,
  type RedirectLink,
  type RedirectLinkCachePayload,
} from "@/lib/links/redirect";
import { cacheGet, cacheSet } from "@/lib/redis";

type RedirectPageProps = {
  params: Promise<{ slug: string }>;
};

async function getRedirectLink(slug: string): Promise<RedirectLink | null> {
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

function scheduleClickLog(input: RedirectClickInput): void {
  after(() => {
    void logRedirectClick(input);
  });
}

export default async function RedirectPage({ params }: RedirectPageProps) {
  const { slug } = await params;
  if (!isPublicSlug(slug)) notFound();

  const headersList = await headers();
  const link = await getRedirectLink(slug);

  if (!link || !isRedirectLinkAvailable(link)) notFound();

  scheduleClickLog(buildRedirectClickInput(link.id, headersList));

  if (link.hasLinkPage) {
    const page = await findPublicLinkPageByLinkId(link.id);
    if (page) {
      return (
        <LinkPageRenderer
          clickCount={link.clickCount}
          destinationUrl={link.destinationUrl}
          page={page}
          shortUrl={buildShortUrlPreview(process.env.NEXT_PUBLIC_APP_URL, link.slug)}
        />
      );
    }
  }

  permanentRedirect(link.destinationUrl);
}
