import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { createMobileSession } from "@/lib/auth/mobile-session";
import {
  hashMobileRefreshToken,
  MobileTokenConfigurationError,
} from "@/lib/auth/mobile-token";
import { getRequestIp } from "@/lib/auth/request-ip";
import { findMobileRefreshUserByHash } from "@/lib/db/queries/mobile-auth";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { mobileRefreshSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const rateLimit = await slidingWindowRateLimit({
      key: `auth:mobile:refresh:${getRequestIp(request)}`,
      limit: 30,
      windowSeconds: 15 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many refresh attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = mobileRefreshSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid refresh input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const user = await findMobileRefreshUserByHash(
      hashMobileRefreshToken(parsed.data.refreshToken),
    );

    if (!user || user.deletedAt || !user.emailVerified) {
      return errorResponse(
        "INVALID_REFRESH_TOKEN",
        "Refresh token is invalid or expired.",
        401,
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

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/refresh" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to refresh mobile session.",
      500,
      requestId,
    );
  }
}
