import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import {
  AnalyticsDateRangeError,
  normalizeAnalyticsDateRange,
  summarizeClickEvents,
  type LinkAnalyticsSummary,
} from "@/lib/analytics/summary";
import {
  listClickEventsForCampaigns,
  listTopLinksForCampaign,
  type CampaignClickEventForAnalytics,
  type TopCampaignLink,
} from "@/lib/db/queries/click-events";
import {
  findCampaignById,
  findCampaignsBySlugsForUser,
  type CampaignWithLinkCount,
} from "@/lib/db/queries/campaigns";
import { getUserPlanById } from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  campaignAnalyticsQuerySchema,
  campaignIdParamsSchema,
  type CampaignAnalyticsQuery,
  type CampaignIdParams,
} from "@/lib/validations/campaign";

type CampaignAnalyticsRouteContext = {
  params: Promise<{ id: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type CampaignAnalyticsParseResult =
  | { query: CampaignAnalyticsQuery }
  | { response: Response };

type CampaignAnalyticsComparison = LinkAnalyticsSummary & {
  id: string;
  linkCount: number;
  name: string;
  slug: string;
};

class CampaignNotFoundError extends Error {
  constructor() {
    super("Campaign not found.");
  }
}

class CampaignForbiddenError extends Error {
  constructor() {
    super("Campaign is owned by another user.");
  }
}

class CampaignComparisonNotFoundError extends Error {
  constructor() {
    super("One or more comparison campaigns were not found.");
  }
}

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function parseParams(
  context: CampaignAnalyticsRouteContext,
  requestId: string,
): Promise<{ params: CampaignIdParams } | { response: Response }> {
  const parsed = campaignIdParamsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign ID.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { params: parsed.data };
}

function parseQuery(
  request: NextRequest,
  requestId: string,
): CampaignAnalyticsParseResult {
  const parsed = campaignAnalyticsQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign analytics query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

async function getAuthenticatedUser(
  requestId: string,
): Promise<{ userId: string; userPlan: UserPlan } | { response: Response }> {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      ),
    };
  }

  const userPlan = await getUserPlanById(userId);
  if (!userPlan) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      ),
    };
  }

  const rateLimit = await slidingWindowRateLimit({
    key: `api:campaigns:analytics:get:${userId}`,
    limit: getApiEndpointRateLimit(userPlan),
    windowSeconds: 60,
  });

  if (rateLimit.limited) {
    return {
      response: errorResponse(
        "RATE_LIMITED",
        "Too many API requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      ),
    };
  }

  return { userId, userPlan };
}

async function getAuthorizedCampaign(
  id: string,
  userId: string,
): Promise<CampaignWithLinkCount> {
  const campaign = await findCampaignById(id);

  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.userId !== userId) throw new CampaignForbiddenError();

  return campaign;
}

async function getComparisonCampaigns(
  slugs: string[] | undefined,
  userId: string,
): Promise<CampaignWithLinkCount[]> {
  if (!slugs?.length) return [];

  const campaigns = await findCampaignsBySlugsForUser({ slugs, userId });
  if (campaigns.length !== slugs.length) {
    throw new CampaignComparisonNotFoundError();
  }

  return slugs.flatMap((slug) => {
    const campaign = campaigns.find((item) => item.slug === slug);
    return campaign ? [campaign] : [];
  });
}

function groupEventsByCampaign(
  events: CampaignClickEventForAnalytics[],
): Map<string, CampaignClickEventForAnalytics[]> {
  const groups = new Map<string, CampaignClickEventForAnalytics[]>();

  for (const event of events) {
    const campaignEvents = groups.get(event.campaignId) ?? [];
    campaignEvents.push(event);
    groups.set(event.campaignId, campaignEvents);
  }

  return groups;
}

function buildComparison(
  campaign: CampaignWithLinkCount,
  summary: LinkAnalyticsSummary,
): CampaignAnalyticsComparison {
  return {
    ...summary,
    id: campaign.id,
    linkCount: campaign.linkCount,
    name: campaign.name,
    slug: campaign.slug,
  };
}

function formatTopLink(link: TopCampaignLink) {
  return {
    destinationUrl: link.destinationUrl,
    id: link.id,
    slug: link.slug,
    title: link.title,
    totalClicks: link.totalClicks,
  };
}

function handleKnownError(error: unknown, requestId: string): Response | null {
  if (error instanceof CampaignNotFoundError) {
    return errorResponse("CAMPAIGN_NOT_FOUND", "Campaign not found.", 404, requestId);
  }

  if (error instanceof CampaignForbiddenError) {
    return errorResponse(
      "FORBIDDEN",
      "You do not have access to this campaign.",
      403,
      requestId,
    );
  }

  if (error instanceof CampaignComparisonNotFoundError) {
    return errorResponse(
      "CAMPAIGN_COMPARISON_NOT_FOUND",
      "One or more comparison campaigns were not found.",
      404,
      requestId,
    );
  }

  if (error instanceof AnalyticsDateRangeError) {
    return errorResponse("VALIDATION_ERROR", error.message, 400, requestId);
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: CampaignAnalyticsRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const parsedQuery = parseQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const campaign = await getAuthorizedCampaign(
      parsedParams.params.id,
      authResult.userId,
    );
    const compareCampaigns = await getComparisonCampaigns(
      parsedQuery.query.compare,
      authResult.userId,
    );
    const range = normalizeAnalyticsDateRange(parsedQuery.query);
    const campaigns = [campaign, ...compareCampaigns];
    const campaignIds = [...new Set(campaigns.map((item) => item.id))];
    const [events, topLinks] = await Promise.all([
      listClickEventsForCampaigns({
        campaignIds,
        from: range.from,
        to: range.to,
      }),
      listTopLinksForCampaign({
        campaignId: campaign.id,
        from: range.from,
        to: range.to,
      }),
    ]);
    const eventsByCampaign = groupEventsByCampaign(events);
    const summary = summarizeClickEvents(eventsByCampaign.get(campaign.id) ?? [], range);
    const comparisons = compareCampaigns.map((item) =>
      buildComparison(
        item,
        summarizeClickEvents(eventsByCampaign.get(item.id) ?? [], range),
      ),
    );

    return successResponse({
      ...summary,
      campaign: {
        id: campaign.id,
        linkCount: campaign.linkCount,
        name: campaign.name,
        slug: campaign.slug,
      },
      comparisons,
      range: {
        from: range.from,
        to: range.to,
      },
      topLinks: topLinks.map(formatTopLink),
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    console.error("[GET /api/v1/campaigns/[id]/analytics]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get campaign analytics.",
      500,
      requestId,
    );
  }
}
