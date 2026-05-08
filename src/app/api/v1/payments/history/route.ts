import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  findBillingUserById,
  listPaymentTransactionsByUserId,
} from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  paymentHistoryQuerySchema,
  type PaymentHistoryQuery,
} from "@/lib/validations/payment";

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function getAuthenticatedBillingUser(
  requestId: string,
): Promise<{ userId: string } | { response: Response }> {
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

  const user = await findBillingUserById(userId);
  if (!user) {
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
    key: `api:payments:history:${userId}`,
    limit: getApiEndpointRateLimit(user.plan),
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

  return { userId };
}

function parseHistoryQuery(
  request: NextRequest,
  requestId: string,
): { query: PaymentHistoryQuery } | { response: Response } {
  const parsed = paymentHistoryQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid payment history query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedBillingUser(requestId);
    if ("response" in authResult) return authResult.response;

    const parsedQuery = parseHistoryQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const result = await listPaymentTransactionsByUserId({
      ...parsedQuery.query,
      userId: authResult.userId,
    });

    return successResponse(result.items, 200, {
      limit: parsedQuery.query.limit,
      page: parsedQuery.query.page,
      total: result.total,
    });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/payments/history" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list payment history.",
      500,
      requestId,
    );
  }
}
