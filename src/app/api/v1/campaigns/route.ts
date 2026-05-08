import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  createListMeta,
  parseCreatedAtCursorParam,
} from "@/lib/api/pagination";
import {
  countCampaignsByUserId,
  createCampaignRecord,
  isUniqueCampaignConstraintViolation,
  listCampaignsByUserId,
  type CampaignRecord,
  type CampaignWithLinkCount,
} from "@/lib/db/queries/campaigns";
import {
  getApiEndpointRateLimit,
  hasReachedCampaignQuota,
  type UserPlan,
} from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  createCampaignSchema,
  listCampaignsQuerySchema,
  type ListCampaignsQuery,
} from "@/lib/validations/campaign";

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

function formatCampaign(
  campaign: CampaignRecord | CampaignWithLinkCount,
): Omit<CampaignWithLinkCount, "userId"> {
  return {
    createdAt: campaign.createdAt,
    description: campaign.description,
    id: campaign.id,
    linkCount: "linkCount" in campaign ? campaign.linkCount : 0,
    name: campaign.name,
    slug: campaign.slug,
    updatedAt: campaign.updatedAt,
    utmCampaign: campaign.utmCampaign,
    utmContent: campaign.utmContent,
    utmMedium: campaign.utmMedium,
    utmSource: campaign.utmSource,
    utmTerm: campaign.utmTerm,
  };
}

async function getAuthenticatedUser(
  request: NextRequest,
  method: string,
  requestId: string,
): Promise<{ userId: string; userPlan: UserPlan } | { response: Response }> {
  const requestUser = await getAuthenticatedRequestUser(request);
  if (!requestUser) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      ),
    };
  }

  const rateLimit = await slidingWindowRateLimit({
    key: `api:campaigns:${method.toLowerCase()}:${requestUser.userId}`,
    limit: getApiEndpointRateLimit(requestUser.userPlan, requestUser.role),
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

  return { userId: requestUser.userId, userPlan: requestUser.userPlan };
}

function parseListQuery(
  request: NextRequest,
  requestId: string,
): { query: ListCampaignsQuery } | { response: Response } {
  const parsed = listCampaignsQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign list query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, "GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedQuery = parseListQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const parsedCursor = parseCreatedAtCursorParam(
      parsedQuery.query.cursor,
      requestId,
    );
    if ("response" in parsedCursor) return parsedCursor.response;

    const { items, nextCursor, total } = await listCampaignsByUserId({
      ...parsedQuery.query,
      cursor: parsedCursor.cursor,
      userId: authResult.userId,
    });

    return successResponse(
      items.map((campaign) => formatCampaign(campaign)),
      200,
      createListMeta({
        cursor: parsedQuery.query.cursor,
        limit: parsedQuery.query.limit,
        nextCursor,
        page: parsedQuery.query.page,
        total,
      }),
    );
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/campaigns" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list campaigns.",
      500,
      requestId,
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, "POST", requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = createCampaignSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const campaignCount = await countCampaignsByUserId(authResult.userId);
    if (hasReachedCampaignQuota(authResult.userPlan, campaignCount)) {
      return errorResponse(
        "CAMPAIGN_QUOTA_EXCEEDED",
        "Campaign quota exceeded.",
        403,
        requestId,
      );
    }

    const campaign = await createCampaignRecord({
      ...parsedBody.data,
      userId: authResult.userId,
    });

    return successResponse(formatCampaign(campaign), 201);
  } catch (error) {
    if (isUniqueCampaignConstraintViolation(error)) {
      return errorResponse(
        "CAMPAIGN_SLUG_ALREADY_EXISTS",
        "This campaign slug is already taken.",
        409,
        requestId,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/campaigns" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to create campaign.",
      500,
      requestId,
    );
  }
}
