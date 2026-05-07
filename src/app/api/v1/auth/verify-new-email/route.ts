import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  deletePendingEmailChange,
  getPendingEmailChange,
} from "@/lib/auth/email-change";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  findUserIdByEmail,
  updateUserEmail,
} from "@/lib/db/queries/email-change";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { verifyNewEmailSchema } from "@/lib/validations/auth";

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
    const parsedBody = verifyNewEmailSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid email verification input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:verify-new-email:${userId}`,
      limit: 10,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many email verification attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const pending = await getPendingEmailChange(userId);
    if (
      !pending ||
      pending.email !== parsedBody.data.email ||
      pending.otp !== parsedBody.data.otp
    ) {
      return errorResponse(
        "INVALID_OTP",
        "Invalid verification code.",
        400,
        requestId,
      );
    }

    const existingUserId = await findUserIdByEmail(parsedBody.data.email);
    if (existingUserId && existingUserId !== userId) {
      return errorResponse(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
        409,
        requestId,
      );
    }

    const updated = await updateUserEmail({
      email: parsedBody.data.email,
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

    await deletePendingEmailChange(userId);

    return successResponse({ email: parsedBody.data.email });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/verify-new-email" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to verify new email.",
      500,
      requestId,
    );
  }
}
