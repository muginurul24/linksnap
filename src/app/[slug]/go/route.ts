import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  buildRedirectClickInput,
  type RedirectClickInput,
} from "@/lib/analytics/click-logger";
import { recordRedirectClick } from "@/lib/analytics/click-queue";
import {
  findPublicLinkPageByLinkId,
  findRedirectLinkBySlug,
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
import {
  buildRuleEvaluationContext,
  evaluateSmartRulesForLink,
} from "@/lib/rules/rule-engine";
import {
  checkRedirectRateLimit,
  createRedirectRateLimitResponse,
} from "@/lib/security/redirect-rate-limit";
import { resolveSplitTestRedirect } from "@/lib/split-tests/router";

type LinkPageCtaRouteContext = {
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

async function recordClickLog(input: RedirectClickInput): Promise<void> {
  await recordRedirectClick(input);
}

function notFoundResponse(): Response {
  return new Response("Not found", { status: 404 });
}

export async function GET(request: Request, context: LinkPageCtaRouteContext) {
  const { slug } = await context.params;
  if (!isPublicSlug(slug)) return notFoundResponse();

  const rateLimit = await checkRedirectRateLimit({
    headers: request.headers,
    kind: "cta",
  });
  if (rateLimit.limited) return createRedirectRateLimitResponse(rateLimit);

  const link = await getRedirectLink(slug);
  if (!link || !isRedirectLinkAvailable(link) || !link.hasLinkPage) {
    return notFoundResponse();
  }

  const page = await findPublicLinkPageByLinkId(link.id);
  if (!page) return notFoundResponse();

  const headersList = await headers();
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

  await recordClickLog(
    buildRedirectClickInput(link.id, headersList, {
      eventType: "LINK_PAGE_CTA_CLICK",
      linkPageHasCountdown:
        page.showCountdown === true && page.countdownTarget !== null,
      ruleId: ruleResult?.ruleId ?? null,
    }),
  );

  return NextResponse.redirect(
    ruleResult?.destinationUrl ??
      splitTestResult?.destinationUrl ??
      link.destinationUrl,
    308,
  );
}
