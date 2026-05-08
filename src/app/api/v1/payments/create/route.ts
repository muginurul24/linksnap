import { NextRequest } from "next/server";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  createPendingTransactionRecord,
  findBillingUserById,
} from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import {
  assertPayGateConfigured,
  createPayGateCharge,
  PayGateApiError,
  PayGateConfigurationError,
} from "@/lib/payments/paygate";
import {
  calculateGrossAmountIdr,
  calculatePlanAmountUsd,
  getUsdIdrRate,
  PaymentConfigurationError,
} from "@/lib/payments/pricing";
import {
  buildPaymentRedirectUrls,
  getConfiguredPaymentBaseUrl,
  normalizePaymentBaseUrl,
} from "@/lib/payments/redirects";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  createPaymentSchema,
  type CreatePaymentInput,
} from "@/lib/validations/payment";

export const runtime = "nodejs";

type AuthenticatedPaymentUser = {
  email: string | null;
  name: string | null;
  userId: string;
};

function generatePaymentOrderId(): string {
  const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `LS-${Date.now()}-${entropy}`;
}

async function getAuthenticatedPaymentUser(
  request: NextRequest,
  requestId: string,
): Promise<AuthenticatedPaymentUser | { response: Response }> {
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

  const user = await findBillingUserById(authUser.userId);
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
    key: `api:payments:create:${authUser.userId}`,
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

  return {
    email: user.email,
    name: user.name,
    userId: authUser.userId,
  };
}

function calculatePaymentAmount(input: CreatePaymentInput): {
  grossAmountIdr: number;
  grossAmountUsd: number;
} {
  const grossAmountUsd = calculatePlanAmountUsd(input);
  const grossAmountIdr = calculateGrossAmountIdr(grossAmountUsd, getUsdIdrRate());

  return { grossAmountIdr, grossAmountUsd };
}

function buildPaymentWebhookUrl(baseUrl: string): string {
  return `${normalizePaymentBaseUrl(baseUrl)}/api/v1/payments/webhook`;
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedPaymentUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = createPaymentSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid payment input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    assertPayGateConfigured();

    const { grossAmountIdr, grossAmountUsd } = calculatePaymentAmount(parsedBody.data);
    const orderId = generatePaymentOrderId();
    const paymentBaseUrl = getConfiguredPaymentBaseUrl() ?? request.nextUrl.origin;
    const callbackUrls = buildPaymentRedirectUrls({
      baseUrl: paymentBaseUrl,
      orderId,
    });

    await createPendingTransactionRecord({
      duration: parsedBody.data.duration,
      grossAmountIdr,
      grossAmountUsd,
      orderId,
      plan: parsedBody.data.plan,
      userId: authResult.userId,
    });

    const payGateCharge = await createPayGateCharge({
      bank: "bca",
      callbackUrl: buildPaymentWebhookUrl(paymentBaseUrl),
      customer: {
        email: authResult.email,
        name: authResult.name,
      },
      duration: parsedBody.data.duration,
      grossAmountIdr,
      orderId,
      plan: parsedBody.data.plan,
      metadata: {
        duration: parsedBody.data.duration,
        plan: parsedBody.data.plan,
        source: "linksnap",
      },
    });

    const payGateTransaction = payGateCharge.data;

    return successResponse(
      {
        orderId,
        paymentType: payGateTransaction.payment_type,
        redirectUrl: callbackUrls.finish,
        status: payGateTransaction.status,
        transactionId: payGateTransaction.transaction_id,
        vaNumbers: payGateTransaction.midtrans?.va_numbers ?? [],
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof PayGateConfigurationError ||
      error instanceof PaymentConfigurationError
    ) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof PayGateApiError) {
      logApiErrorResponse({
        code: "PAYMENT_PROVIDER_ERROR",
        error,
        requestId,
        route: "POST /api/v1/payments/create",
        status: error.status,
      });
      return errorResponse(
        "PAYMENT_PROVIDER_ERROR",
        "Payment provider rejected the transaction.",
        502,
        requestId,
        { providerStatus: error.status },
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/payments/create" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to create payment transaction.",
      500,
      requestId,
    );
  }
}
