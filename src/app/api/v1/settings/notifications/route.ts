import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { updateSettingsUserNotifications } from "@/lib/db/queries/settings";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { notificationPreferencesSchema } from "@/lib/validations/settings";

async function getAuthenticatedSettingsUser(
  request: NextRequest,
  requestId: string,
): Promise<
  { plan: UserPlan; role: string; userId: string } | { response: Response }
> {
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

  return {
    plan: requestUser.userPlan,
    role: requestUser.role,
    userId: requestUser.userId,
  };
}

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedSettingsUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = notificationPreferencesSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid notification preferences.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `api:settings:notifications:patch:${authResult.userId}`,
      limit: getApiEndpointRateLimit(authResult.plan, authResult.role),
      windowSeconds: 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many settings requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const notifications = await updateSettingsUserNotifications({
      notifications: parsedBody.data,
      userId: authResult.userId,
    });

    if (!notifications) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse({ notifications });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "PATCH /api/v1/settings/notifications" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to update notifications.",
      500,
      requestId,
    );
  }
}
