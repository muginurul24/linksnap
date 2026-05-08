import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, permanentRedirect } from "next/navigation";
import { LinkPageRenderer } from "@/components/link-page/link-page-renderer";
import {
  buildRedirectClickInput,
  type RedirectClickInput,
} from "@/lib/analytics/click-logger";
import { recordRedirectClick } from "@/lib/analytics/click-queue";
import { findPublicLinkPageByLinkId } from "@/lib/db/queries/links";
import { getRedirectLink } from "@/lib/links/redirect-cache";
import { buildShortUrlPreview } from "@/lib/links/preview";
import {
  isPublicSlug,
  isRedirectLinkAvailable,
} from "@/lib/links/redirect";
import {
  buildRuleEvaluationContext,
  evaluateSmartRulesForLink,
} from "@/lib/rules/rule-engine";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { resolveSplitTestRedirect } from "@/lib/split-tests/router";

type RedirectPageProps = {
  params: Promise<{ slug: string }>;
};

async function recordClickLog(input: RedirectClickInput): Promise<void> {
  await recordRedirectClick(input);
}

async function recordCountedClickLog(
  input: RedirectClickInput,
  currentClickCount: number,
): Promise<void> {
  await recordRedirectClick(input, { currentClickCount });
}

export async function generateMetadata({
  params,
}: RedirectPageProps): Promise<Metadata> {
  const { slug } = await params;

  return createPublicMetadata({
    title: "Opening Link",
    description: "Opening a LinkSnap short link.",
    path: isPublicSlug(slug) ? `/${slug}` : "/",
    noIndex: true,
  });
}

export default async function RedirectPage({ params }: RedirectPageProps) {
  const { slug } = await params;
  if (!isPublicSlug(slug)) notFound();

  const headersList = await headers();
  const link = await getRedirectLink(slug);

  if (!link || !isRedirectLinkAvailable(link)) notFound();

  if (link.hasLinkPage) {
    const page = await findPublicLinkPageByLinkId(link.id);
    if (page) {
      const linkPageHasCountdown =
        page.showCountdown === true && page.countdownTarget !== null;
      const shortUrl = buildShortUrlPreview(
        process.env.NEXT_PUBLIC_APP_URL,
        link.slug,
      );

      await recordClickLog(
        buildRedirectClickInput(link.id, headersList, {
          eventType: "LINK_PAGE_VIEW",
          linkPageHasCountdown,
        }),
      );

      return (
        <LinkPageRenderer
          clickCount={link.clickCount}
          ctaUrl={`${shortUrl}/go`}
          page={page}
          shortUrl={shortUrl}
        />
      );
    }
  }

  const ruleResult = await evaluateSmartRulesForLink({
    context: buildRuleEvaluationContext(headersList),
    defaultDestinationUrl: link.destinationUrl,
    linkId: link.id,
    slug: link.slug,
  });
  const splitTestResult = ruleResult
    ? null
    : await resolveSplitTestRedirect({
        defaultDestinationUrl: link.destinationUrl,
        linkId: link.id,
      });

  await recordCountedClickLog(
    buildRedirectClickInput(link.id, headersList, {
      eventType: "DIRECT_REDIRECT",
      ruleId: ruleResult?.ruleId ?? null,
    }),
    link.clickCount,
  );

  permanentRedirect(
    ruleResult?.destinationUrl ??
      splitTestResult?.destinationUrl ??
      link.destinationUrl,
  );
}
