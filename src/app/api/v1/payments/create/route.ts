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
  PayGateUnsupportedChannelError,
  type PayGateChargeInput,
  type PayGatePaymentAction,
} from "@/lib/payments/paygate";
import type {
  BankCode,
  CstoreCode,
  EwalletCode,
  PaymentChannelCode,
} from "@/lib/payments/payment-channel-codes";
import {
  getChannelById,
  type PaymentChannel as PaymentChannelDefinition,
} from "@/lib/payments/payment-channels";
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

type PaymentChannelResponse = {
  category: PaymentChannelDefinition["category"];
  categoryLabel: string;
  estimatedProcessingTime: string;
  id: PaymentChannelCode;
  instructions: string;
  name: string;
  shortName: string;
};

type PayGateChannelInput = Pick<
  PayGateChargeInput,
  "bank" | "ewallet" | "paymentMethod" | "store"
>;

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

function getRequestedPaymentMethod(input: CreatePaymentInput): string {
  const requestedMethod =
    input.paymentMethod ?? input.bank ?? input.ewallet ?? input.store ?? "bca";

  return requestedMethod;
}

function validateRequestedPaymentChannel(
  input: CreatePaymentInput,
): PaymentChannelDefinition | null {
  const requestedMethod = getRequestedPaymentMethod(input);
  const channel = getChannelById(requestedMethod);

  return channel?.enabled ? channel : null;
}

function buildPayGateChannelInput(
  channel: PaymentChannelDefinition,
): PayGateChannelInput {
  if (channel.category === "bank_transfer") {
    return {
      bank: channel.id as BankCode,
      paymentMethod: channel.id,
    };
  }

  if (channel.category === "ewallet") {
    return {
      ewallet: channel.id as EwalletCode,
      paymentMethod: channel.id,
    };
  }

  if (channel.category === "convenience_store") {
    return {
      paymentMethod: channel.id,
      store: channel.id as CstoreCode,
    };
  }

  return {
    paymentMethod: "qris",
  };
}

function buildPaymentChannelResponse(
  channel: PaymentChannelDefinition,
): PaymentChannelResponse {
  return {
    category: channel.category,
    categoryLabel: channel.categoryLabel,
    estimatedProcessingTime: channel.estimatedProcessingTime,
    id: channel.id,
    instructions: channel.instructions,
    name: channel.name,
    shortName: channel.shortName,
  };
}

function getPayGateQrUrl(transaction: {
  midtrans?: { qr_url?: string };
  qr_url?: string;
}): string | null {
  return transaction.qr_url ?? transaction.midtrans?.qr_url ?? null;
}

function getPayGateQrString(transaction: {
  midtrans?: { qr_string?: string };
  qr_string?: string;
}): string | null {
  return transaction.qr_string ?? transaction.midtrans?.qr_string ?? null;
}

function getPayGatePaymentCode(transaction: {
  midtrans?: { payment_code?: string };
  payment_code?: string;
}): string | null {
  return transaction.payment_code ?? transaction.midtrans?.payment_code ?? null;
}

function getPayGatePaymentActions(transaction: {
  actions?: PayGatePaymentAction[];
  midtrans?: { actions?: PayGatePaymentAction[] };
}): PayGatePaymentAction[] {
  return transaction.actions ?? transaction.midtrans?.actions ?? [];
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

    const paymentChannel = validateRequestedPaymentChannel(parsedBody.data);
    if (!paymentChannel) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Unsupported payment method.",
        400,
        requestId,
        { paymentMethod: getRequestedPaymentMethod(parsedBody.data) },
      );
    }

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
      callbackUrl: buildPaymentWebhookUrl(paymentBaseUrl),
      customer: {
        email: authResult.email,
        name: authResult.name,
      },
      duration: parsedBody.data.duration,
      grossAmountIdr,
      orderId,
      ...buildPayGateChannelInput(paymentChannel),
      plan: parsedBody.data.plan,
      metadata: {
        duration: parsedBody.data.duration,
        paymentMethod: paymentChannel.id,
        paymentType: paymentChannel.paymentType,
        plan: parsedBody.data.plan,
        source: "linksnap",
      },
    });

    const payGateTransaction = payGateCharge.data;

    return successResponse(
      {
        actions: getPayGatePaymentActions(payGateTransaction),
        channel: buildPaymentChannelResponse(paymentChannel),
        expiresAt: payGateTransaction.expires_at ?? null,
        orderId,
        paymentCode: getPayGatePaymentCode(payGateTransaction),
        paymentMethod: payGateTransaction.payment_method ?? paymentChannel.id,
        paymentType: payGateTransaction.payment_type,
        qrString: getPayGateQrString(payGateTransaction),
        qrUrl: getPayGateQrUrl(payGateTransaction),
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

    if (error instanceof PayGateUnsupportedChannelError) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Unsupported payment method.",
        400,
        requestId,
        { paymentMethod: error.paymentMethod },
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
