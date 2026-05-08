import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { getDashboardOverviewByUserId } from "@/lib/db/queries/dashboard";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `api:dashboard:overview:${authUser.userId}`,
      limit: getApiEndpointRateLimit(authUser.userPlan, authUser.role),
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

    const overview = await getDashboardOverviewByUserId({ userId: authUser.userId });

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
