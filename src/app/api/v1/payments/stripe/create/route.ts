import Stripe from "stripe";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import {
  createPendingTransactionRecord,
  findBillingUserById,
} from "@/lib/db/queries/payments";
import { getApiEndpointRateLimit } from "@/lib/links/limits";
import {
  StripeCheckoutError,
  createStripeCheckoutSession,
} from "@/lib/payments/stripe-checkout";
import {
  StripeConfigurationError,
  assertStripeConfigured,
} from "@/lib/payments/stripe";
import {
  calculateGrossAmountIdr,
  calculatePlanAmountUsd,
  getUsdIdrRate,
  PaymentConfigurationError,
} from "@/lib/payments/pricing";
import {
  getConfiguredPaymentBaseUrl,
  normalizePaymentBaseUrl,
} from "@/lib/payments/redirects";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  createStripeCheckoutSchema,
  type CreateStripeCheckoutInput,
} from "@/lib/validations/stripe";

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

function generateStripePaymentOrderId(): string {
  const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `LS-ST-${Date.now()}-${entropy}`;
}

async function getAuthenticatedStripePaymentUser(
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
    key: `api:payments:stripe:create:${userId}`,
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

function calculateStripePaymentAmount(input: CreateStripeCheckoutInput): {
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
    const authResult = await getAuthenticatedStripePaymentUser(requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsedBody = createStripeCheckoutSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid Stripe checkout input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    assertStripeConfigured();

    const { grossAmountIdr, grossAmountUsd } = calculateStripePaymentAmount(
      parsedBody.data,
    );
    const orderId = generateStripePaymentOrderId();
    const baseUrl = normalizePaymentBaseUrl(
      getConfiguredPaymentBaseUrl() ?? request.nextUrl.origin,
    );

    await createPendingTransactionRecord({
      duration: parsedBody.data.duration,
      gateway: "stripe",
      grossAmountIdr,
      grossAmountUsd,
      orderId,
      plan: parsedBody.data.plan,
      userId: authResult.userId,
    });

    const session = await createStripeCheckoutSession({
      amountUsd: grossAmountUsd,
      baseUrl,
      customer: {
        email: authResult.email,
        name: authResult.name,
      },
      duration: parsedBody.data.duration,
      orderId,
      plan: parsedBody.data.plan,
      userId: authResult.userId,
    });

    return successResponse(
      {
        orderId,
        sessionId: session.id,
        url: session.url,
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof StripeConfigurationError ||
      error instanceof PaymentConfigurationError
    ) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof StripeCheckoutError) {
      return errorResponse(
        "PAYMENT_PROVIDER_ERROR",
        "Payment provider rejected the checkout session.",
        502,
        requestId,
      );
    }

    if (error instanceof Stripe.errors.StripeError) {
      console.error("[POST /api/v1/payments/stripe/create] Stripe error", {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
      });
      return errorResponse(
        "PAYMENT_PROVIDER_ERROR",
        "Payment provider rejected the checkout session.",
        502,
        requestId,
        { providerStatus: error.statusCode },
      );
    }

    console.error("[POST /api/v1/payments/stripe/create]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to create Stripe checkout session.",
      500,
      requestId,
    );
  }
}
