import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { isOtpExpired } from "@/lib/auth/otp";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { verifyEmailSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid verification input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:verify:${parsed.data.email}`,
      limit: 10,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many verification attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (!user) {
      return errorResponse("INVALID_OTP", "Invalid verification code.", 400, requestId);
    }

    if (user.emailVerified) {
      return successResponse();
    }

    if (
      user.otpCode !== parsed.data.otp ||
      isOtpExpired(user.otpExpiresAt)
    ) {
      return errorResponse("INVALID_OTP", "Invalid verification code.", 400, requestId);
    }

    await db
      .update(users)
      .set({
        emailVerified: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return successResponse();
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/verify" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to verify email.",
      500,
      requestId,
    );
  }
}
