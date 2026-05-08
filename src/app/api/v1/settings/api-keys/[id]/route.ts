import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { deleteApiKeyForUser } from "@/lib/db/queries/api-keys";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { apiKeyIdParamsSchema, type ApiKeyIdParams } from "@/lib/validations/api-key";

export const runtime = "nodejs";

type ApiKeyRouteContext = {
  params: Promise<{ id: string }>;
};

async function parseParams(
  context: ApiKeyRouteContext,
  requestId: string,
): Promise<{ params: ApiKeyIdParams } | { response: Response }> {
  const parsed = apiKeyIdParamsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid API key ID.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { params: parsed.data };
}

export async function DELETE(
  request: NextRequest,
  context: ApiKeyRouteContext,
) {
  const requestId = createRequestId();

  try {
    const requestUser = await getAuthenticatedRequestUser(request);
    if (!requestUser) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `api:settings:api-keys:delete:${requestUser.userId}`,
      limit: getApiEndpointRateLimit(requestUser.userPlan, requestUser.role),
      windowSeconds: 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many API key management requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const deleted = await deleteApiKeyForUser({
      id: parsedParams.params.id,
      userId: requestUser.userId,
    });

    if (!deleted) {
      return errorResponse(
        "API_KEY_NOT_FOUND",
        "API key not found.",
        404,
        requestId,
      );
    }

    return successResponse({ deleted: true, id: parsedParams.params.id });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "DELETE /api/v1/settings/api-keys/[id]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to revoke API key.",
      500,
      requestId,
    );
  }
}
