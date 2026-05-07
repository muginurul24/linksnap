import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateApiKeyRequest } from "@/lib/auth/api-key";
import {
  createRequestId,
  errorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  getUserPlanById,
  listLinkPagesByUserId,
  type ListedLinkPage,
} from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

async function getAuthenticatedUser(
  request: NextRequest,
  requestId: string,
): Promise<{ userId: string; userPlan: UserPlan } | { response: Response }> {
  const apiKeyAuth = await authenticateApiKeyRequest(request);
  if (apiKeyAuth) {
    return {
      userId: apiKeyAuth.userId,
      userPlan: apiKeyAuth.userPlan,
    };
  }

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

  return { userId, userPlan };
}

async function checkRateLimit({
  requestId,
  userId,
  userPlan,
}: {
  requestId: string;
  userId: string;
  userPlan: UserPlan;
}): Promise<Response | null> {
  const rateLimit = await slidingWindowRateLimit({
    key: `api:pages:list:${userId}`,
    limit: getApiEndpointRateLimit(userPlan),
    windowSeconds: 60,
  });

  if (!rateLimit.limited) return null;

  return errorResponse(
    "RATE_LIMITED",
    "Too many API requests.",
    429,
    requestId,
    { retryAfter: rateLimit.retryAfter },
  );
}

function formatLinkPage(page: ListedLinkPage) {
  return {
    brandName: page.brandName,
    ctaClicks: page.ctaClicks,
    ctaText: page.ctaText,
    hasCountdown: page.hasCountdown,
    id: page.id,
    isActive: page.isActive,
    linkId: page.linkId,
    pageViews: page.pageViews,
    showQrCode: page.showQrCode,
    slug: page.slug,
    title: page.title,
    updatedAt: page.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const rateLimit = await checkRateLimit({
      requestId,
      userId: authResult.userId,
      userPlan: authResult.userPlan,
    });
    if (rateLimit) return rateLimit;

    const pages = await listLinkPagesByUserId(authResult.userId);

    return successResponse(pages.map(formatLinkPage));
  } catch (error) {
    console.error("[GET /api/v1/pages]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list Link Pages.",
      500,
      requestId,
    );
  }
}
