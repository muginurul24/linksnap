import QRCode from "qrcode";
import {
  auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { getSessionUserId } from "@/lib/auth/session-user";
import { createTotpSecret, createTotpUri } from "@/lib/auth/two-factor";
import {
  findTwoFactorLoginUserById,
  saveTwoFactorSetupSecret,
} from "@/lib/db/queries/two-factor";

export const runtime = "nodejs";

export async function POST() {
  const requestId = createRequestId();

  try {
    const userId = getSessionUserId(await auth());
    if (!userId) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const user = await findTwoFactorLoginUserById(userId);
    if (!user) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    if (user.twoFactorEnabled) {
      return errorResponse(
        "TWO_FACTOR_ALREADY_ENABLED",
        "Two-factor authentication is already enabled.",
        409,
        requestId,
      );
    }

    const secret = createTotpSecret();
    const otpauthUrl = createTotpUri({ email: user.email, secret });
    const saved = await saveTwoFactorSetupSecret({ secret, userId });

    if (!saved) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });

    return successResponse({
      otpauthUrl,
      qrCodeDataUrl,
      secret,
    });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/2fa/setup" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to start two-factor setup.",
      500,
      requestId,
    );
  }
}
