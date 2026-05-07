import { NextRequest } from "next/server";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { verifyPassword } from "@/lib/auth/password";
import { getRequestIp } from "@/lib/auth/request-ip";
import { createTwoFactorChallenge } from "@/lib/auth/two-factor-challenge";
import { findTwoFactorLoginUserByEmail } from "@/lib/db/queries/two-factor";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { twoFactorChallengeSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsedBody = twoFactorChallengeSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid sign-in input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:login:${getRequestIp(request)}`,
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many sign-in attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await findTwoFactorLoginUserByEmail(parsedBody.data.email);
    if (!user?.passwordHash) {
      return errorResponse(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
        401,
        requestId,
      );
    }

    const validPassword = await verifyPassword(
      parsedBody.data.password,
      user.passwordHash,
    );
    if (!validPassword) {
      return errorResponse(
        "INVALID_CREDENTIALS",
        "Invalid email or password.",
        401,
        requestId,
      );
    }

    if (!user.emailVerified) {
      return errorResponse(
        "EMAIL_NOT_VERIFIED",
        "Email is not verified.",
        403,
        requestId,
      );
    }

    const twoFactorRequired = user.twoFactorEnabled && Boolean(user.twoFactorSecret);
    const challengeId = await createTwoFactorChallenge({
      kind: twoFactorRequired ? "two_factor" : "password",
      userId: user.id,
    });

    return successResponse({
      challengeId,
      twoFactorRequired,
    });
  } catch (error) {
    console.error("[POST /api/v1/auth/2fa/challenge]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to start sign-in.",
      500,
      requestId,
    );
  }
}
