import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  InvalidPaymentPlanError,
  PaymentAmountMismatchError,
  UnknownPaymentOrderError,
  handlePayGatePaymentWebhook,
} from "@/lib/payments/paygate-webhook-handler";
import { PayGateConfigurationError } from "@/lib/payments/paygate";
import { verifyPayGateWebhookSignature } from "@/lib/payments/paygate-webhook";
import { payGateWebhookSchema } from "@/lib/validations/payment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const rawBody = await request.text();
    const timestamp = request.headers.get("x-webhook-timestamp");
    const signature = request.headers.get("x-webhook-signature");

    if (
      !timestamp ||
      !signature ||
      !verifyPayGateWebhookSignature(rawBody, timestamp, signature)
    ) {
      return errorResponse(
        "INVALID_SIGNATURE",
        "Invalid PayGate webhook signature.",
        401,
        requestId,
      );
    }

    const body = JSON.parse(rawBody) as unknown;
    const parsedBody = payGateWebhookSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid PayGate webhook payload.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const result = await handlePayGatePaymentWebhook(parsedBody.data);

    return successResponse(
      {
        activatedSubscription: result.activatedSubscription,
        ignored: result.ignored,
        orderId: result.orderId,
        status: result.status,
      },
      200,
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid PayGate webhook payload.",
        400,
        requestId,
      );
    }

    if (error instanceof PayGateConfigurationError) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof UnknownPaymentOrderError) {
      return errorResponse(
        "PAYMENT_ORDER_NOT_FOUND",
        "Payment order was not found.",
        404,
        requestId,
      );
    }

    if (error instanceof PaymentAmountMismatchError) {
      return errorResponse(
        "PAYMENT_AMOUNT_MISMATCH",
        "Payment amount does not match the order.",
        400,
        requestId,
      );
    }

    if (error instanceof InvalidPaymentPlanError) {
      return errorResponse(
        "PAYMENT_ORDER_INVALID",
        "Payment order data is invalid.",
        500,
        requestId,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/payments/webhook" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to process payment notification.",
      500,
      requestId,
    );
  }
}
