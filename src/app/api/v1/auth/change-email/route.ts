import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { createPendingEmailChange } from "@/lib/auth/email-change";
import { generateOtp } from "@/lib/auth/otp";
import { verifyPassword } from "@/lib/auth/password";
import { getSessionUserId } from "@/lib/auth/session-user";
import {
  findEmailChangeUserById,
  findUserIdByEmail,
} from "@/lib/db/queries/email-change";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { changeEmailSchema } from "@/lib/validations/auth";

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
    const parsedBody = changeEmailSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid email change input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:change-email:${userId}`,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many email change attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await findEmailChangeUserById(userId);
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

    if (parsedBody.data.email === user.email) {
      return errorResponse(
        "EMAIL_UNCHANGED",
        "Enter a different email address.",
        400,
        requestId,
      );
    }

    const existingUserId = await findUserIdByEmail(parsedBody.data.email);
    if (existingUserId) {
      return errorResponse(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
        409,
        requestId,
      );
    }

    const otp = generateOtp();
    await createPendingEmailChange({
      email: parsedBody.data.email,
      otp,
      userId,
    });
    await sendVerificationEmail({ otp, to: parsedBody.data.email });

    return successResponse({ email: parsedBody.data.email });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/change-email" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to start email change.",
      500,
      requestId,
    );
  }
}
