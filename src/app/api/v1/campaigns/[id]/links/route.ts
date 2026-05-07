import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { findCampaignById } from "@/lib/db/queries/campaigns";
import {
  getUserPlanById,
  listLinksByUserId,
  listOwnedLinkIdsByIds,
  removeLinkFromCampaignForUser,
  setLinksCampaignForUser,
  type ListedLink,
} from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  addCampaignLinksSchema,
  campaignIdParamsSchema,
  listCampaignsQuerySchema,
  removeCampaignLinkSchema,
  type CampaignIdParams,
  type ListCampaignsQuery,
} from "@/lib/validations/campaign";

type CampaignLinksRouteContext = {
  params: Promise<{ id: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type ListQueryParseResult = { query: ListCampaignsQuery } | { response: Response };

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

class CampaignLinkNotFoundError extends Error {
  constructor() {
    super("Campaign link not found.");
  }
}

class LinkOwnershipError extends Error {
  constructor() {
    super("One or more links are not owned by the user.");
  }
}

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");

  return request.nextUrl.origin;
}

function buildShortUrl(request: NextRequest, slug: string): string {
  return `${getBaseUrl(request)}/${slug}`;
}

function formatLink(request: NextRequest, link: ListedLink) {
  return {
    campaignId: link.campaignId,
    clickCount: link.clickCount,
    createdAt: link.createdAt,
    destinationUrl: link.destinationUrl,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    isActive: link.isActive,
    shortUrl: buildShortUrl(request, link.slug),
    slug: link.slug,
    title: link.title,
    updatedAt: link.updatedAt,
  };
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function parseParams(
  context: CampaignLinksRouteContext,
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

async function getAuthenticatedUser(
  method: string,
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
    key: `api:campaigns:links:${method.toLowerCase()}:${userId}`,
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

async function getAuthorizedCampaign(id: string, userId: string): Promise<void> {
  const campaign = await findCampaignById(id);

  if (!campaign) throw new CampaignNotFoundError();
  if (campaign.userId !== userId) throw new CampaignForbiddenError();
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

  if (error instanceof CampaignLinkNotFoundError) {
    return errorResponse(
      "CAMPAIGN_LINK_NOT_FOUND",
      "Link is not assigned to this campaign.",
      404,
      requestId,
    );
  }

  if (error instanceof LinkOwnershipError) {
    return errorResponse(
      "LINK_NOT_FOUND",
      "One or more links were not found.",
      404,
      requestId,
    );
  }

  return null;
}

function parseListQuery(
  request: NextRequest,
  requestId: string,
): ListQueryParseResult {
  const parsed = listCampaignsQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign links query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

export async function GET(
  request: NextRequest,
  context: CampaignLinksRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const parsedQuery = parseListQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    await getAuthorizedCampaign(parsedParams.params.id, authResult.userId);

    const { items, total } = await listLinksByUserId({
      campaignId: parsedParams.params.id,
      ...parsedQuery.query,
      userId: authResult.userId,
    });

    return successResponse(
      items.map((link) => formatLink(request, link)),
      200,
      {
        limit: parsedQuery.query.limit,
        page: parsedQuery.query.page,
        total,
      },
    );
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    console.error("[GET /api/v1/campaigns/[id]/links]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list campaign links.",
      500,
      requestId,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: CampaignLinksRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("POST", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = addCampaignLinksSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign links input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    await getAuthorizedCampaign(parsedParams.params.id, authResult.userId);

    const ownedLinkIds = await listOwnedLinkIdsByIds({
      linkIds: parsedBody.data.linkIds,
      userId: authResult.userId,
    });
    if (ownedLinkIds.length !== parsedBody.data.linkIds.length) {
      throw new LinkOwnershipError();
    }

    const updatedLinkIds = await setLinksCampaignForUser({
      campaignId: parsedParams.params.id,
      linkIds: parsedBody.data.linkIds,
      userId: authResult.userId,
    });

    return successResponse({
      campaignId: parsedParams.params.id,
      linkIds: updatedLinkIds,
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    console.error("[POST /api/v1/campaigns/[id]/links]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to add campaign links.",
      500,
      requestId,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: CampaignLinksRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("DELETE", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = removeCampaignLinkSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign link removal input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    await getAuthorizedCampaign(parsedParams.params.id, authResult.userId);

    const removed = await removeLinkFromCampaignForUser({
      campaignId: parsedParams.params.id,
      linkId: parsedBody.data.linkId,
      userId: authResult.userId,
    });
    if (!removed) throw new CampaignLinkNotFoundError();

    return successResponse({
      campaignId: parsedParams.params.id,
      linkId: removed.id,
      removed: true,
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    console.error("[DELETE /api/v1/campaigns/[id]/links]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to remove campaign link.",
      500,
      requestId,
    );
  }
}
