import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { deleteApiKeyForUser } from "@/lib/db/queries/api-keys";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { apiKeyIdParamsSchema, type ApiKeyIdParams } from "@/lib/validations/api-key";

export const runtime = "nodejs";

type ApiKeyRouteContext = {
  params: Promise<{ id: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

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
  _request: NextRequest,
  context: ApiKeyRouteContext,
) {
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

    const user = await findBillingUserById(userId);
    if (!user) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `api:settings:api-keys:delete:${userId}`,
      limit: getApiEndpointRateLimit(user.plan),
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
      userId,
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
