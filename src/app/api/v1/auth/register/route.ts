import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { generateOtp, getOtpExpiresAt } from "@/lib/auth/otp";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { registerApiSchema } from "@/lib/validations/auth";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimit = await slidingWindowRateLimit({
      key: `auth:register:${getClientIp(request)}`,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many registration attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = registerApiSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid registration input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (existing) {
      return errorResponse(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email already exists.",
        409,
        requestId,
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const otp = generateOtp();
    const [newUser] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        passwordHash,
        otpCode: otp,
        otpExpiresAt: getOtpExpiresAt(),
      })
      .returning({ id: users.id });

    try {
      await sendVerificationEmail({ to: parsed.data.email, otp });
    } catch (error) {
      await db.delete(users).where(eq(users.id, newUser.id));
      throw error;
    }

    return successResponse(undefined, 201);
  } catch (error) {
    console.error("[POST /api/v1/auth/register]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to register account.",
      500,
      requestId,
    );
  }
}
