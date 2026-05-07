import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  countCampaignsByUserId,
  createCampaignRecord,
  isUniqueCampaignConstraintViolation,
  listCampaignsByUserId,
  type CampaignRecord,
  type CampaignWithLinkCount,
} from "@/lib/db/queries/campaigns";
import { getUserPlanById } from "@/lib/db/queries/links";
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

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

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
    key: `api:campaigns:${method.toLowerCase()}:${userId}`,
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
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedQuery = parseListQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const { items, total } = await listCampaignsByUserId({
      ...parsedQuery.query,
      userId: authResult.userId,
    });

    return successResponse(
      items.map((campaign) => formatCampaign(campaign)),
      200,
      {
        limit: parsedQuery.query.limit,
        page: parsedQuery.query.page,
        total,
      },
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
    const authResult = await getAuthenticatedUser("POST", requestId);
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
