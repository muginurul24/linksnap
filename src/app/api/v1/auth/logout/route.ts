import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import { hashMobileRefreshToken } from "@/lib/auth/mobile-token";
import {
  clearMobileRefreshTokenHash,
  findMobileRefreshUserByHash,
} from "@/lib/db/queries/mobile-auth";
import { mobileLogoutSchema } from "@/lib/validations/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = mobileLogoutSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid logout input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const authUser = await getAuthenticatedRequestUser(request);
    if (authUser) {
      await clearMobileRefreshTokenHash({ userId: authUser.userId });
      return successResponse();
    }

    if (parsed.data.refreshToken) {
      const refreshUser = await findMobileRefreshUserByHash(
        hashMobileRefreshToken(parsed.data.refreshToken),
      );
      if (refreshUser) {
        await clearMobileRefreshTokenHash({ userId: refreshUser.id });
      }
    }

    return successResponse();
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/auth/logout" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to sign out.",
      500,
      requestId,
    );
  }
}
