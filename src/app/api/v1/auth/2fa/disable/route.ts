import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  disableTwoFactor,
  findTwoFactorLoginUserById,
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
    if (!user?.passwordHash) {
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

    const disabled = await disableTwoFactor(userId);
    if (!disabled) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse();
  } catch (error) {
    console.error("[POST /api/v1/auth/2fa/disable]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to disable two-factor authentication.",
      500,
      requestId,
    );
  }
}
