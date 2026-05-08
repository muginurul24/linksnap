import { NextRequest } from "next/server";
import { adminRouteGuard } from "@/lib/admin/guard";
import { getSystemStats } from "@/lib/db/queries/admin";
import {
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";

export async function GET(_request: NextRequest) {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;

  try {
    const stats = await getSystemStats();
    return successResponse(stats);
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: "GET /api/v1/admin/analytics",
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get system analytics.",
      500,
      admin.requestId,
    );
  }
}
