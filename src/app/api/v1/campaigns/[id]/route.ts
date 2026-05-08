import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  deleteCampaignForUser,
  findCampaignById,
  isUniqueCampaignConstraintViolation,
  updateCampaignRecordForUser,
  type CampaignWithLinkCount,
} from "@/lib/db/queries/campaigns";
import { getUserPlanById } from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  campaignIdParamsSchema,
  updateCampaignSchema,
  type CampaignIdParams,
} from "@/lib/validations/campaign";

type CampaignRouteContext = {
  params: Promise<{ id: string }>;
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

function formatCampaign(
  campaign: CampaignWithLinkCount,
): Omit<CampaignWithLinkCount, "userId"> {
  return {
    createdAt: campaign.createdAt,
    description: campaign.description,
    id: campaign.id,
    linkCount: campaign.linkCount,
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

async function parseParams(
  context: CampaignRouteContext,
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
    key: `api:campaigns:item:${method.toLowerCase()}:${userId}`,
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

  return null;
}

export async function GET(
  _request: NextRequest,
  context: CampaignRouteContext,
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const campaign = await getAuthorizedCampaign(
      parsedParams.params.id,
      authResult.userId,
    );

    return successResponse(formatCampaign(campaign));
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/campaigns/[id]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get campaign.",
      500,
      requestId,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: CampaignRouteContext,
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("PATCH", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = updateCampaignSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid campaign update input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    await getAuthorizedCampaign(parsedParams.params.id, authResult.userId);

    const updated = await updateCampaignRecordForUser({
      ...parsedBody.data,
      id: parsedParams.params.id,
      userId: authResult.userId,
    });
    if (!updated) throw new CampaignNotFoundError();

    return successResponse(formatCampaign(updated));
  } catch (error) {
    if (isUniqueCampaignConstraintViolation(error)) {
      return errorResponse(
        "CAMPAIGN_SLUG_ALREADY_EXISTS",
        "This campaign slug is already taken.",
        409,
        requestId,
      );
    }

    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "PATCH /api/v1/campaigns/[id]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to update campaign.",
      500,
      requestId,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: CampaignRouteContext,
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("DELETE", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    await getAuthorizedCampaign(parsedParams.params.id, authResult.userId);

    const deleted = await deleteCampaignForUser({
      id: parsedParams.params.id,
      userId: authResult.userId,
    });
    if (!deleted) throw new CampaignNotFoundError();

    return successResponse({ deleted: true, id: deleted.id });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "DELETE /api/v1/campaigns/[id]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to delete campaign.",
      500,
      requestId,
    );
  }
}
