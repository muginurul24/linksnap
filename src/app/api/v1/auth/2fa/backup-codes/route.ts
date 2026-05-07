import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionUserId } from "@/lib/auth/session-user";
import { generateBackupCodes } from "@/lib/auth/two-factor";
import {
  findTwoFactorLoginUserById,
  replaceTwoFactorBackupCodes,
} from "@/lib/db/queries/two-factor";
import { twoFactorPasswordSchema } from "@/lib/validations/auth";

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
    const parsedBody = twoFactorPasswordSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid password input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const user = await findTwoFactorLoginUserById(userId);
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      return errorResponse(
        "TWO_FACTOR_NOT_ENABLED",
        "Two-factor authentication is not enabled.",
        400,
        requestId,
      );
    }

    if (!user.passwordHash) {
      return errorResponse(
        "PASSWORD_REQUIRED",
        "Password confirmation is required for this account.",
        400,
        requestId,
      );
    }

    const passwordValid = await verifyPassword(
      parsedBody.data.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      return errorResponse(
        "INVALID_PASSWORD",
        "Password is invalid.",
        400,
        requestId,
      );
    }

    const backupCodes = generateBackupCodes();
    const updated = await replaceTwoFactorBackupCodes({
      backupCodeHashes: backupCodes.hashes,
      userId,
    });

    if (!updated) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse({ backupCodes: backupCodes.codes });
  } catch (error) {
    console.error("[POST /api/v1/auth/2fa/backup-codes]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to regenerate backup codes.",
      500,
      requestId,
    );
  }
}
