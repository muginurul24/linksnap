import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { findLinkBySlug, getUserPlanById } from "@/lib/db/queries/links";
import {
  canUseCustomSlug,
  getApiEndpointRateLimit,
  type UserPlan,
} from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  linkSlugParamsSchema,
  type LinkSlugParams,
} from "@/lib/validations/link";

type LinkSlugRouteContext = {
  params: Promise<{ slug: string }>;
};

async function parseParams(
  context: LinkSlugRouteContext,
  requestId: string,
): Promise<{ params: LinkSlugParams } | { response: Response }> {
  const parsed = linkSlugParamsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid link slug.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { params: parsed.data };
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
    key: `api:links:slug:get:${userId}`,
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

export async function GET(
  _request: NextRequest,
  context: LinkSlugRouteContext,
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const existingLink = await findLinkBySlug(parsedParams.params.slug);

    return successResponse({
      available: existingLink === null,
      customSlugAllowed: canUseCustomSlug(authResult.userPlan),
      slug: parsedParams.params.slug,
    });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/slug/[slug]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to check slug availability.",
      500,
      requestId,
    );
  }
}
