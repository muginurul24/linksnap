import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { updateSettingsUserProfile } from "@/lib/db/queries/settings";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { deleteDashboardSubscriptionSnapshot } from "@/lib/payments/dashboard-subscription-cache";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { settingsProfileSchema } from "@/lib/validations/settings";

async function getAuthenticatedSettingsUser(
  request: NextRequest,
  requestId: string,
): Promise<{ plan: UserPlan; userId: string } | { response: Response }> {
  const authUser = await getAuthenticatedRequestUser(request);
  if (!authUser) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      ),
    };
  }

  return { plan: authUser.userPlan, userId: authUser.userId };
}

async function checkSettingsRateLimit({
  key,
  plan,
  requestId,
}: {
  key: string;
  plan: UserPlan;
  requestId: string;
}): Promise<Response | null> {
  const rateLimit = await slidingWindowRateLimit({
    key,
    limit: getApiEndpointRateLimit(plan),
    windowSeconds: 60,
  });

  if (!rateLimit.limited) return null;

  return errorResponse(
    "RATE_LIMITED",
    "Too many settings requests.",
    429,
    requestId,
    { retryAfter: rateLimit.retryAfter },
  );
}

export async function PATCH(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedSettingsUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = settingsProfileSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid profile input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await checkSettingsRateLimit({
      key: `api:settings:profile:patch:${authResult.userId}`,
      plan: authResult.plan,
      requestId,
    });
    if (rateLimit) return rateLimit;

    const user = await updateSettingsUserProfile({
      name: parsedBody.data.name,
      userId: authResult.userId,
    });

    if (!user) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    await deleteDashboardSubscriptionSnapshot(authResult.userId);

    return successResponse({
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "PATCH /api/v1/settings/profile" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to update profile.",
      500,
      requestId,
    );
  }
}
