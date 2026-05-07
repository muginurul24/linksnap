import {
  auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { getDashboardOverviewByUserId } from "@/lib/db/queries/dashboard";
import { getUserPlanById } from "@/lib/db/queries/links";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export async function GET() {
  const requestId = createRequestId();

  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const userPlan = await getUserPlanById(userId);
    if (!userPlan) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `api:dashboard:overview:${userId}`,
      limit: getApiEndpointRateLimit(userPlan),
      windowSeconds: 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many dashboard overview requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const overview = await getDashboardOverviewByUserId({ userId });

    return successResponse(overview);
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/dashboard/overview" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get dashboard overview.",
      500,
      requestId,
    );
  }
}
