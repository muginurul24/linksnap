import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  buildDashboardAnalyticsData,
  DashboardAnalyticsRangeError,
  normalizeDashboardAnalyticsRange,
  } from "@/lib/analytics/dashboard";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { listClickEventsForUser } from "@/lib/db/queries/click-events";
import { getUserPlanById } from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { dashboardAnalyticsQuerySchema } from "@/lib/validations/analytics";

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
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
    key: `api:analytics:get:${userId}`,
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

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(requestId);
    if ("response" in authResult) return authResult.response;

    const parsedQuery = dashboardAnalyticsQuerySchema.safeParse(
      getQueryParams(request),
    );
    if (!parsedQuery.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid analytics query.",
        400,
        requestId,
        parsedQuery.error.flatten(),
      );
    }

    const range = normalizeDashboardAnalyticsRange(parsedQuery.data);
    const events = await listClickEventsForUser({
      from: range.from,
      to: range.to,
      userId: authResult.userId,
    });
    const analytics = buildDashboardAnalyticsData({ events, range });

    return successResponse({
      range: analytics.range,
      summary: analytics.summary,
    });
  } catch (error) {
    if (error instanceof DashboardAnalyticsRangeError) {
      return errorResponse(
        "VALIDATION_ERROR",
        error.message,
        400,
        requestId,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/analytics" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get analytics.",
      500,
      requestId,
    );
  }
}
