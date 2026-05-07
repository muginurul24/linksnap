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
  handleMidtransPaymentWebhook,
} from "@/lib/payments/webhook-handler";
import {
  MidtransConfigurationError,
  getMidtransServerKey,
} from "@/lib/payments/midtrans";
import { verifyMidtransSignature } from "@/lib/payments/webhook";
import { midtransWebhookNotificationSchema } from "@/lib/validations/payment";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsedBody = midtransWebhookNotificationSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid Midtrans notification.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const serverKey = getMidtransServerKey();
    if (!verifyMidtransSignature(parsedBody.data, serverKey)) {
      return errorResponse(
        "INVALID_SIGNATURE",
        "Invalid Midtrans notification signature.",
        401,
        requestId,
      );
    }

    const result = await handleMidtransPaymentWebhook(parsedBody.data);

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
    if (error instanceof MidtransConfigurationError) {
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
