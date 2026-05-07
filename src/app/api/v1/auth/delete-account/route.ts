import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  findAccountDeletionUserById,
  softDeleteAccount,
} from "@/lib/db/queries/account-deletion";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { deleteAccountSchema } from "@/lib/validations/auth";

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
    const parsedBody = deleteAccountSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid account deletion input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:delete-account:${userId}`,
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many account deletion attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await findAccountDeletionUserById(userId);
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

    const deleted = await softDeleteAccount(userId);
    if (!deleted) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse();
  } catch (error) {
    console.error("[POST /api/v1/auth/delete-account]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to delete account.",
      500,
      requestId,
    );
  }
}
