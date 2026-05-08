import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { errorResponse, createRequestId } from "@/lib/api/response";
import type { NextResponse } from "next/server";

type AdminRouteContext = {
  adminUserId: string;
  requestId: string;
};

type AdminGuardResult =
  | { ok: true; admin: AdminRouteContext }
  | { ok: false; response: NextResponse };

export async function adminRouteGuard(): Promise<AdminGuardResult> {
  const requestId = createRequestId();

  const authResult = await requireSuperAdmin();
  if (!authResult.ok) {
    return {
      ok: false,
      response: errorResponse(
        authResult.status === 403 ? "SUPERADMIN_REQUIRED" : "AUTHENTICATION_REQUIRED",
        authResult.message,
        authResult.status,
        requestId,
      ),
    };
  }

  const rateLimit = await slidingWindowRateLimit({
    key: `admin:api:${authResult.userId}`,
    limit: 30,
    windowSeconds: 60,
  });

  if (rateLimit.limited) {
    return {
      ok: false,
      response: errorResponse(
        "RATE_LIMITED",
        "Too many admin API requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      ),
    };
  }

  return {
    ok: true,
    admin: {
      adminUserId: authResult.userId,
      requestId,
    },
  };
}
