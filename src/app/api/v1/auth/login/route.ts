import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { createMobileSession } from "@/lib/auth/mobile-session";
import { MobileTokenConfigurationError } from "@/lib/auth/mobile-token";
import { verifyPassword } from "@/lib/auth/password";
import { getRequestIp } from "@/lib/auth/request-ip";
import { findMobileLoginUserByEmail } from "@/lib/db/queries/mobile-auth";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { loginSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

function invalidCredentialsResponse(requestId: string): Response {
  return errorResponse(
    "INVALID_CREDENTIALS",
    "Invalid email or password.",
    401,
    requestId,
  );
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimit = await slidingWindowRateLimit({
      key: `auth:mobile:login:${getRequestIp(request)}`,
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many login attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid login input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const user = await findMobileLoginUserByEmail(parsed.data.email);
    if (!user?.passwordHash || user.deletedAt) {
      return invalidCredentialsResponse(requestId);
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return invalidCredentialsResponse(requestId);
    }

    if (!user.emailVerified) {
      return errorResponse(
        "EMAIL_NOT_VERIFIED",
        "Verify your email before signing in.",
        403,
        requestId,
      );
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      return errorResponse(
        "TWO_FACTOR_REQUIRED",
        "Two-factor authentication is not supported in the mobile app yet.",
        403,
        requestId,
      );
    }

    return successResponse(await createMobileSession(user));
  } catch (error) {
    if (error instanceof MobileTokenConfigurationError) {
      return errorResponse(
        "AUTH_CONFIGURATION_ERROR",
        "Mobile authentication is not configured.",
        503,
        requestId,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/login" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to sign in.",
      500,
      requestId,
    );
  }
}
