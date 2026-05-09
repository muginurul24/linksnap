import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { invalidateSubscriptionCaches } from "@/lib/cache/invalidation";
import { expireDueSubscriptions } from "@/lib/payments/subscription";

export const runtime = "nodejs";

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    if (!process.env.CRON_SECRET?.trim()) {
      return errorResponse(
        "CRON_CONFIGURATION_ERROR",
        "Cron secret is not configured.",
        503,
        requestId,
      );
    }

    if (!isAuthorizedCronRequest(request)) {
      return errorResponse(
        "UNAUTHORIZED",
        "Cron authorization is required.",
        401,
        requestId,
      );
    }

    const result = await expireDueSubscriptions();
    const userIds = result.userIds ?? [];
    await Promise.all(
      userIds.map((userId) =>
        invalidateSubscriptionCaches({
          reason: "subscription_expiry",
          requestId,
          userId,
        }),
      ),
    );

    return successResponse(
      {
        downgradedUsers: result.downgradedUsers,
        expiredSubscriptions: result.expiredSubscriptions,
      },
      200,
    );
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/payments/subscriptions/renew" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to process subscription renewals.",
      500,
      requestId,
    );
  }
}
