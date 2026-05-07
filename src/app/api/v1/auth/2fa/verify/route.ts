import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  generateBackupCodes,
  verifyTotpToken,
} from "@/lib/auth/two-factor";
import {
  enableTwoFactor,
  findTwoFactorLoginUserById,
} from "@/lib/db/queries/two-factor";
import { twoFactorVerifySchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const parsedBody = twoFactorVerifySchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid two-factor token.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const user = await findTwoFactorLoginUserById(userId);
    if (!user?.twoFactorSecret) {
      return errorResponse(
        "TWO_FACTOR_SETUP_REQUIRED",
        "Start two-factor setup before verifying a token.",
        400,
        requestId,
      );
    }

    const tokenValid = verifyTotpToken({
      secret: user.twoFactorSecret,
      token: parsedBody.data.token,
    });
    if (!tokenValid) {
      return errorResponse(
        "INVALID_TWO_FACTOR_TOKEN",
        "Verification code is invalid.",
        400,
        requestId,
      );
    }

    const backupCodes = generateBackupCodes();
    const enabled = await enableTwoFactor({
      backupCodeHashes: backupCodes.hashes,
      userId,
    });

    if (!enabled) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse({ backupCodes: backupCodes.codes });
  } catch (error) {
    console.error("[POST /api/v1/auth/2fa/verify]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to verify two-factor setup.",
      500,
      requestId,
    );
  }
}
