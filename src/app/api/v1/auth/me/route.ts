import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { formatMobileUser } from "@/lib/auth/mobile-session";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import { findMobileSessionUserById } from "@/lib/db/queries/mobile-auth";

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

    const user = await findMobileSessionUserById(authUser.userId);
    if (!user || user.deletedAt) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    return successResponse({ user: formatMobileUser(user) });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/auth/me" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to load current user.",
      500,
      requestId,
    );
  }
}
