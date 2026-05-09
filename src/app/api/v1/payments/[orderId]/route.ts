import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { findCheckoutTransactionByOrderId } from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import {
  getPayGateTransaction,
  PayGateApiError,
  PayGateConfigurationError,
} from "@/lib/payments/paygate";
import { getFriendlyPayGateError } from "@/lib/payments/paygate-errors";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { checkoutSuccessQuerySchema } from "@/lib/validations/payment";

export const runtime = "nodejs";

type PaymentDetailRouteContext = {
  params: Promise<{ orderId: string }>;
};

async function getAuthenticatedBillingUser(
  request: NextRequest,
  requestId: string,
): Promise<{ userId: string } | { response: Response }> {
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

  const rateLimit = await slidingWindowRateLimit({
    key: `api:payments:detail:${authUser.userId}`,
    limit: getApiEndpointRateLimit(authUser.userPlan, authUser.role),
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

  return { userId: authUser.userId };
}

async function parsePaymentDetailParams(
  context: PaymentDetailRouteContext,
  requestId: string,
): Promise<{ orderId: string } | { response: Response }> {
  const params = await context.params;
  const parsed = checkoutSuccessQuerySchema.safeParse({
    order_id: params.orderId,
  });

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid payment order ID.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { orderId: parsed.data.order_id };
}

export async function GET(
  request: NextRequest,
  context: PaymentDetailRouteContext,
) {
  const requestId = createRequestId();
  let paymentMethod: string | null = null;

  try {
    const authResult = await getAuthenticatedBillingUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parsePaymentDetailParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const transaction = await findCheckoutTransactionByOrderId({
      orderId: parsedParams.orderId,
      userId: authResult.userId,
    });

    if (!transaction) {
      return errorResponse(
        "PAYMENT_ORDER_NOT_FOUND",
        "Payment order was not found.",
        404,
        requestId,
      );
    }
    paymentMethod = transaction.paymentMethod;

    const payGateTransaction = await getPayGateTransaction(parsedParams.orderId);

    return successResponse(
      {
        ...payGateTransaction.data,
        localStatus: transaction.status,
      },
      200,
    );
  } catch (error) {
    if (error instanceof PayGateConfigurationError) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof PayGateApiError) {
      const friendlyError = getFriendlyPayGateError(error, paymentMethod);
      logApiErrorResponse({
        code: "PAYMENT_PROVIDER_ERROR",
        error,
        requestId,
        route: "GET /api/v1/payments/[orderId]",
        status: error.status,
      });
      return errorResponse(
        "PAYMENT_PROVIDER_ERROR",
        friendlyError.message,
        502,
        requestId,
        friendlyError.details,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/payments/[orderId]" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to load payment transaction.",
      500,
      requestId,
    );
  }
}
