import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import {
  attachTransactionSnapToken,
  createPendingTransactionRecord,
  findBillingUserById,
} from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import {
  assertMidtransConfigured,
  createMidtransSnapTransaction,
  MidtransApiError,
  MidtransConfigurationError,
} from "@/lib/payments/midtrans";
import {
  calculateGrossAmountIdr,
  calculatePlanAmountUsd,
  getUsdIdrRate,
  PaymentConfigurationError,
} from "@/lib/payments/pricing";
import {
  buildPaymentRedirectUrls,
  getConfiguredPaymentBaseUrl,
} from "@/lib/payments/redirects";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  createPaymentSchema,
  type CreatePaymentInput,
} from "@/lib/validations/payment";

export const runtime = "nodejs";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type AuthenticatedPaymentUser = {
  email: string | null;
  name: string | null;
  userId: string;
};

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function generatePaymentOrderId(): string {
  const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `LS-${Date.now()}-${entropy}`;
}

async function getAuthenticatedPaymentUser(
  requestId: string,
): Promise<AuthenticatedPaymentUser | { response: Response }> {
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
    key: `api:payments:create:${userId}`,
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

  return {
    email: user.email,
    name: user.name,
    userId,
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

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedPaymentUser(requestId);
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

    assertMidtransConfigured();

    const { grossAmountIdr, grossAmountUsd } = calculatePaymentAmount(parsedBody.data);
    const orderId = generatePaymentOrderId();
    const callbackUrls = buildPaymentRedirectUrls({
      baseUrl: getConfiguredPaymentBaseUrl() ?? request.nextUrl.origin,
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

    const snapTransaction = await createMidtransSnapTransaction({
      callbackUrls,
      customer: {
        email: authResult.email,
        name: authResult.name,
      },
      duration: parsedBody.data.duration,
      grossAmountIdr,
      orderId,
      plan: parsedBody.data.plan,
    });

    const transaction = await attachTransactionSnapToken({
      orderId,
      snapToken: snapTransaction.token,
    });

    if (!transaction) {
      throw new Error("Unable to attach Midtrans Snap token.");
    }

    return successResponse(
      {
        orderId,
        redirectUrl: snapTransaction.redirectUrl,
        snapToken: snapTransaction.token,
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof MidtransConfigurationError ||
      error instanceof PaymentConfigurationError
    ) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof MidtransApiError) {
      console.error("[POST /api/v1/payments/create] Midtrans error", {
        message: error.message,
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

    console.error("[POST /api/v1/payments/create]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to create payment transaction.",
      500,
      requestId,
    );
  }
}
