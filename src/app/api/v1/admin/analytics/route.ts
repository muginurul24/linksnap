import { adminRouteGuard, withAdminActionHeader } from "@/lib/admin/guard";
import { getSystemStats } from "@/lib/db/queries/admin";
import {
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";

export async function GET() {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;

  try {
    const stats = await getSystemStats();
    return withAdminActionHeader(successResponse(stats));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: "GET /api/v1/admin/analytics",
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to get system analytics.",
      500,
      admin.requestId,
    ));
  }
}
