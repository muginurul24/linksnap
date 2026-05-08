import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  canUseApiKeys,
  generateApiKey,
  getApiKeyDisplayPrefix,
  hashApiKey,
  maskApiKey,
  } from "@/lib/auth/api-key";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  createApiKeyRecord,
  listApiKeysByUserId,
} from "@/lib/db/queries/api-keys";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { createApiKeySchema } from "@/lib/validations/api-key";

export const runtime = "nodejs";

type ApiKeySettingsUser = {
  plan: Extract<UserPlan, "PRO" | "BUSINESS">;
  role: string;
  userId: string;
};

async function getAuthenticatedApiKeySettingsUser(
  request: NextRequest,
  method: string,
  requestId: string,
): Promise<ApiKeySettingsUser | { response: Response }> {
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

  if (!canUseApiKeys(requestUser.userPlan)) {
    return {
      response: errorResponse(
        "PLAN_UPGRADE_REQUIRED",
        "API keys require a Pro or Business plan.",
        403,
        requestId,
      ),
    };
  }

  const rateLimit = await slidingWindowRateLimit({
    key: `api:settings:api-keys:${method.toLowerCase()}:${requestUser.userId}`,
    limit: getApiEndpointRateLimit(requestUser.userPlan, requestUser.role),
    windowSeconds: 60,
  });

  if (rateLimit.limited) {
    return {
      response: errorResponse(
        "RATE_LIMITED",
        "Too many API key management requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      ),
    };
  }

  return {
    plan: requestUser.userPlan,
    role: requestUser.role,
    userId: requestUser.userId,
  };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedApiKeySettingsUser(
      request,
      "GET",
      requestId,
    );
    if ("response" in authResult) return authResult.response;

    const keys = await listApiKeysByUserId(authResult.userId);

    return successResponse(keys);
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/settings/api-keys" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list API keys.",
      500,
      requestId,
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedApiKeySettingsUser(
      request,
      "POST",
      requestId,
    );
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = createApiKeySchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid API key input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const key = generateApiKey();
    const apiKey = await createApiKeyRecord({
      keyHash: hashApiKey(key),
      keyPrefix: getApiKeyDisplayPrefix(key),
      name: parsedBody.data.name,
      userId: authResult.userId,
    });

    return successResponse(
      {
        apiKey,
        key,
        maskedKey: maskApiKey(key),
      },
      201,
    );
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/settings/api-keys" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to create API key.",
      500,
      requestId,
    );
  }
}
