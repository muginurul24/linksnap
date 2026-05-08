import { NextRequest } from "next/server";
import { adminRouteGuard, withAdminActionHeader } from "@/lib/admin/guard";
import { listAdminAuditLogs } from "@/lib/db/queries/admin-audit";
import { adminAuditLogQuerySchema } from "@/lib/validations/admin";
import {
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = adminAuditLogQuerySchema.safeParse(params);
    if (!parsed.success) {
      return withAdminActionHeader(errorResponse(
        "VALIDATION_ERROR",
        "Invalid query parameters.",
        400,
        admin.requestId,
        parsed.error.flatten(),
      ));
    }

    const { page, limit, action } = parsed.data;
    const result = await listAdminAuditLogs({ limit, page, action });

    return withAdminActionHeader(successResponse(result.entries, 200, {
      page,
      limit,
      total: result.total,
    }));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: "GET /api/v1/admin/audit-log",
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to list audit log entries.",
      500,
      admin.requestId,
    ));
  }
}
