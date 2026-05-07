import { NextRequest } from "next/server";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { getStripeWebhookSecret, StripeConfigurationError } from "@/lib/payments/stripe";
import {
  InvalidStripePaymentPlanError,
  StripeSignatureVerificationError,
  StripeWebhookMetadataError,
  UnknownStripePaymentOrderError,
  handleStripeWebhook,
  verifyStripeWebhookSignature,
} from "@/lib/payments/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");
    const event = verifyStripeWebhookSignature(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
    const result = await handleStripeWebhook(event);

    return successResponse(
      {
        activatedSubscription: result.activatedSubscription,
        eventType: result.eventType,
        ignored: result.ignored,
        orderId: result.orderId,
        userId: result.userId,
      },
      200,
    );
  } catch (error) {
    if (error instanceof StripeConfigurationError) {
      return errorResponse(
        "PAYMENT_CONFIGURATION_ERROR",
        "Payment provider is not configured.",
        503,
        requestId,
      );
    }

    if (error instanceof StripeSignatureVerificationError) {
      return errorResponse(
        "INVALID_SIGNATURE",
        "Invalid Stripe webhook signature.",
        401,
        requestId,
      );
    }

    if (error instanceof UnknownStripePaymentOrderError) {
      return errorResponse(
        "PAYMENT_ORDER_NOT_FOUND",
        "Payment order was not found.",
        404,
        requestId,
      );
    }

    if (error instanceof StripeWebhookMetadataError) {
      return errorResponse(
        "WEBHOOK_METADATA_INVALID",
        "Stripe webhook metadata is invalid.",
        400,
        requestId,
      );
    }

    if (error instanceof InvalidStripePaymentPlanError) {
      return errorResponse(
        "PAYMENT_ORDER_INVALID",
        "Payment order data is invalid.",
        500,
        requestId,
      );
    }

    console.error("[POST /api/v1/payments/stripe/webhook]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to process Stripe webhook.",
      500,
      requestId,
    );
  }
}
