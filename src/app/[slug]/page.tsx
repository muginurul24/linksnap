import { after } from "next/server";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { ArrowUpRight, CalendarClock, Link2 } from "lucide-react";
import {
  buildRedirectClickInput,
  logRedirectClick,
  type RedirectClickInput,
} from "@/lib/analytics/click-logger";
import {
  findPublicLinkPageByLinkId,
  findRedirectLinkBySlug,
  type PublicLinkPage,
} from "@/lib/db/queries/links";
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

const DEFAULT_CTA_COLOR = "#6366f1";

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

function getSafeHexColor(value: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_CTA_COLOR;
}

function formatCountdownTarget(value: Date | null): string | null {
  if (!value) return null;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function PublicLinkPage({
  destinationUrl,
  page,
}: {
  destinationUrl: string;
  page: PublicLinkPage;
}) {
  const ctaColor = getSafeHexColor(page.ctaColor);
  const countdownTarget =
    page.showCountdown === true ? formatCountdownTarget(page.countdownTarget) : null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-5 py-10 sm:px-8">
        <div className="space-y-8">
          <header className="flex items-center gap-3">
            {page.brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.brandLogo}
                alt=""
                className="size-12 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-lg border border-border bg-muted">
                <Link2 className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-muted-foreground">
                {page.brandName}
              </p>
            </div>
          </header>

          {page.ogImage ? (
            <div className="overflow-hidden rounded-lg border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.ogImage}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            </div>
          ) : null}

          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-normal text-balance sm:text-5xl">
              {page.title}
            </h1>
            {page.description ? (
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                {page.description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href={destinationUrl}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              style={{ backgroundColor: ctaColor }}
            >
              {page.ctaText}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </a>
            {countdownTarget ? (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarClock className="size-4" aria-hidden="true" />
                Available until {countdownTarget}
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
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
      return <PublicLinkPage destinationUrl={link.destinationUrl} page={page} />;
    }
  }

  permanentRedirect(link.destinationUrl);
}
