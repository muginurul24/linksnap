import { NextRequest } from "next/server";
import { adminRouteGuard, withAdminActionHeader } from "@/lib/admin/guard";
import { listAllUsers } from "@/lib/db/queries/admin";
import { adminUserListQuerySchema } from "@/lib/validations/admin";
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
    const parsed = adminUserListQuerySchema.safeParse(params);
    if (!parsed.success) {
      return withAdminActionHeader(errorResponse(
        "VALIDATION_ERROR",
        "Invalid query parameters.",
        400,
        admin.requestId,
        parsed.error.flatten(),
      ));
    }

    const { page, limit, search, plan } = parsed.data;
    const result = await listAllUsers({ limit, page, search, plan });

    return withAdminActionHeader(successResponse(
      result.users,
      200,
      { page, limit, total: result.total },
    ));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: "GET /api/v1/admin/users",
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to list users.",
      500,
      admin.requestId,
    ));
  }
}
