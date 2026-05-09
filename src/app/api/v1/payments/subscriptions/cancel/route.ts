import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { cancelActiveSubscriptionForUser } from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { deleteDashboardSubscriptionSnapshot } from "@/lib/payments/dashboard-subscription-cache";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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
      key: `api:payments:subscriptions:cancel:${authUser.userId}`,
      limit: getApiEndpointRateLimit(authUser.userPlan, authUser.role),
      windowSeconds: 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many subscription requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const subscription = await cancelActiveSubscriptionForUser({
      canceledAt: new Date(),
      userId: authUser.userId,
    });

    if (!subscription) {
      return errorResponse(
        "SUBSCRIPTION_NOT_ACTIVE",
        "No active subscription is available to cancel.",
        409,
        requestId,
      );
    }

    await deleteDashboardSubscriptionSnapshot(authUser.userId);

    return successResponse({
      canceledAt: subscription.canceledAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      plan: subscription.plan,
      status: subscription.status,
    });
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId,
      route: "POST /api/v1/payments/subscriptions/cancel",
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to cancel subscription.",
      500,
      requestId,
    );
  }
}
