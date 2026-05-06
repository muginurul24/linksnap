import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { generateOtp, getOtpExpiresAt } from "@/lib/auth/otp";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { resendOtpSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsed = resendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid resend input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:resend-otp:${parsed.data.email}`,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many verification code requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (!user || user.emailVerified) {
      return successResponse();
    }

    const otp = generateOtp();
    await db
      .update(users)
      .set({
        otpCode: otp,
        otpExpiresAt: getOtpExpiresAt(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    await sendVerificationEmail({ to: parsed.data.email, otp });

    return successResponse();
  } catch (error) {
    console.error("[POST /api/v1/auth/resend-otp]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to resend verification code.",
      500,
      requestId,
    );
  }
}
