import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { hashPassword,
  verifyPassword } from "@/lib/auth/password";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { findBillingUserById } from "@/lib/db/queries/payments";
import {
  findPasswordUserById,
  updateUserPasswordHash,
} from "@/lib/db/queries/settings";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { changePasswordSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const body = await request.json().catch(() => null);
    const parsedBody = changePasswordSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid password change input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const user = await findBillingUserById(userId);
    if (!user) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:change-password:${userId}`,
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many password change attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const passwordUser = await findPasswordUserById(userId);
    if (!passwordUser) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    if (!passwordUser.passwordHash) {
      return errorResponse(
        "PASSWORD_CHANGE_UNAVAILABLE",
        "Password change is unavailable for this account.",
        400,
        requestId,
      );
    }

    const currentPasswordValid = await verifyPassword(
      parsedBody.data.currentPassword,
      passwordUser.passwordHash,
    );

    if (!currentPasswordValid) {
      return errorResponse(
        "INVALID_CURRENT_PASSWORD",
        "Current password is invalid.",
        400,
        requestId,
      );
    }

    const passwordHash = await hashPassword(parsedBody.data.password);
    const updated = await updateUserPasswordHash({ passwordHash, userId });

    if (!updated) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse();
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/change-password" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to change password.",
      500,
      requestId,
    );
  }
}
