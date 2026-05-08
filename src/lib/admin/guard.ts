import { requireSuperAdmin } from "@/lib/auth/superadmin";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { errorResponse, createRequestId } from "@/lib/api/response";
import { getDb } from "@/lib/db";
import { users, SUPERADMIN_ROLE } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability/logger";
import type { NextResponse as NextResponseType } from "next/server";

type AdminRouteContext = {
  adminUserId: string;
  requestId: string;
};

type AdminGuardResult =
  | { ok: true; admin: AdminRouteContext }
  | { ok: false; response: NextResponseType };

export function withAdminActionHeader(response: NextResponseType): NextResponseType {
  response.headers.set("X-Admin-Action", "true");
  return response;
}

export async function adminRouteGuard(): Promise<AdminGuardResult> {
  const requestId = createRequestId();

  const authResult = await requireSuperAdmin();
  if (!authResult.ok) {
    return {
      ok: false,
      response: withAdminActionHeader(errorResponse(
        authResult.status === 403 ? "SUPERADMIN_REQUIRED" : "AUTHENTICATION_REQUIRED",
        authResult.message,
        authResult.status,
        requestId,
      )),
    };
  }

  // Re-validate role against DB on every admin API call
  // If user was demoted since JWT was issued, reject immediately
  try {
    const db = getDb();
    const [dbUser] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, authResult.userId))
      .limit(1);

    if (!dbUser || dbUser.role !== SUPERADMIN_ROLE) {
      logger.warn("admin_guard_role_mismatch", {
        userId: authResult.userId,
        dbRole: dbUser?.role ?? "not_found",
      });
      return {
        ok: false,
        response: withAdminActionHeader(errorResponse(
          "SUPERADMIN_REQUIRED",
          "Superadmin access required.",
          403,
          requestId,
        )),
      };
    }
  } catch (error) {
    logger.error("admin_guard_db_validation_failed", { error, userId: authResult.userId });
    return {
      ok: false,
        response: withAdminActionHeader(errorResponse(
        "INTERNAL_ERROR",
        "Unable to verify admin access.",
        500,
        requestId,
      )),
    };
  }

  // Rate limit: 30 req/min for admin routes
  const rateLimit = await slidingWindowRateLimit({
    key: `admin:api:${authResult.userId}`,
    limit: 30,
    windowSeconds: 60,
  });

  if (rateLimit.limited) {
    return {
      ok: false,
      response: withAdminActionHeader(errorResponse(
        "RATE_LIMITED",
        "Too many admin API requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      )),
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
