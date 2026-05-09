import { NextRequest } from "next/server";
import { adminRouteGuard, withAdminActionHeader } from "@/lib/admin/guard";
import {
  getUserDetailById,
  updateUserPlan,
  suspendUser,
  unsuspendUser,
} from "@/lib/db/queries/admin";
import { invalidateAdminPlanOverrideCaches } from "@/lib/cache/invalidation";
import {
  adminUpdateUserPlanSchema,
  adminSuspendUserSchema,
} from "@/lib/validations/admin";
import {
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { logger } from "@/lib/observability/logger";

type RouteParams = { params: Promise<{ id: string }> };

function logAdminActionFailure({
  action,
  adminUserId,
  reason,
  requestId,
  status,
  targetUserId,
}: {
  action: "user.plan.change" | "user.suspend_toggle";
  adminUserId: string;
  reason: "invalid_json" | "validation_error" | "target_not_found";
  requestId: string;
  status: number;
  targetUserId: string;
}): void {
  logger.warn("admin_action_failed", {
    action,
    adminUserId,
    reason,
    requestId,
    status,
    targetUserId,
  });
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;
  const { id } = await params;

  try {
    const user = await getUserDetailById(id);
    if (!user) {
      return withAdminActionHeader(errorResponse(
        "NOT_FOUND",
        "User not found.",
        404,
        admin.requestId,
      ));
    }

    return withAdminActionHeader(successResponse(user));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: `GET /api/v1/admin/users/${id}`,
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to get user details.",
      500,
      admin.requestId,
    ));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logAdminActionFailure({
      action: "user.plan.change",
      adminUserId: admin.adminUserId,
      reason: "invalid_json",
      requestId: admin.requestId,
      status: 400,
      targetUserId: id,
    });
    return withAdminActionHeader(errorResponse(
      "VALIDATION_ERROR",
      "Invalid JSON body.",
      400,
      admin.requestId,
    ));
  }

  const parsed = adminUpdateUserPlanSchema.safeParse(body);
  if (!parsed.success) {
    logAdminActionFailure({
      action: "user.plan.change",
      adminUserId: admin.adminUserId,
      reason: "validation_error",
      requestId: admin.requestId,
      status: 400,
      targetUserId: id,
    });
    return withAdminActionHeader(errorResponse(
      "VALIDATION_ERROR",
      "Invalid plan value.",
      400,
      admin.requestId,
      parsed.error.flatten(),
    ));
  }

  try {
    const result = await updateUserPlan({ userId: id, plan: parsed.data.plan });
    if (!result.updated) {
      logAdminActionFailure({
        action: "user.plan.change",
        adminUserId: admin.adminUserId,
        reason: "target_not_found",
        requestId: admin.requestId,
        status: 404,
        targetUserId: id,
      });
      return withAdminActionHeader(errorResponse(
        "NOT_FOUND",
        "User not found.",
        404,
        admin.requestId,
      ));
    }
    await invalidateAdminPlanOverrideCaches({
      reason: "admin_plan_override",
      requestId: admin.requestId,
      userId: id,
    });

    // Audit log (fire-and-forget)
    void writeAdminAuditLog({
      action: "user.plan.change",
      adminUserId: admin.adminUserId,
      targetUserId: id,
      metadata: {
        previousPlan: result.previousPlan,
        newPlan: parsed.data.plan,
      },
    });

    return withAdminActionHeader(successResponse({
      plan: parsed.data.plan,
      previousPlan: result.previousPlan,
    }));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: `PATCH /api/v1/admin/users/${id}`,
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to update user plan.",
      500,
      admin.requestId,
    ));
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  const guard = await adminRouteGuard();
  if (!guard.ok) return guard.response;

  const { admin } = guard;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logAdminActionFailure({
      action: "user.suspend_toggle",
      adminUserId: admin.adminUserId,
      reason: "invalid_json",
      requestId: admin.requestId,
      status: 400,
      targetUserId: id,
    });
    return withAdminActionHeader(errorResponse(
      "VALIDATION_ERROR",
      "Invalid JSON body.",
      400,
      admin.requestId,
    ));
  }

  const parsed = adminSuspendUserSchema.safeParse(body);
  if (!parsed.success) {
    logAdminActionFailure({
      action: "user.suspend_toggle",
      adminUserId: admin.adminUserId,
      reason: "validation_error",
      requestId: admin.requestId,
      status: 400,
      targetUserId: id,
    });
    return withAdminActionHeader(errorResponse(
      "VALIDATION_ERROR",
      "Action must be 'suspend' or 'unsuspend'.",
      400,
      admin.requestId,
      parsed.error.flatten(),
    ));
  }

  try {
    const isSuspend = parsed.data.action === "suspend";
    const success = isSuspend
      ? await suspendUser(id)
      : await unsuspendUser(id);

    if (!success) {
      logAdminActionFailure({
        action: "user.suspend_toggle",
        adminUserId: admin.adminUserId,
        reason: "target_not_found",
        requestId: admin.requestId,
        status: 404,
        targetUserId: id,
      });
      return withAdminActionHeader(errorResponse(
        "NOT_FOUND",
        "User not found.",
        404,
        admin.requestId,
      ));
    }

    // Audit log (fire-and-forget)
    void writeAdminAuditLog({
      action: isSuspend ? "user.suspend" : "user.unsuspend",
      adminUserId: admin.adminUserId,
      targetUserId: id,
    });

    return withAdminActionHeader(successResponse({ action: parsed.data.action }));
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId: admin.requestId,
      route: `POST /api/v1/admin/users/${id}`,
    });
    return withAdminActionHeader(errorResponse(
      "INTERNAL_ERROR",
      "Unable to process suspend/unsuspend action.",
      500,
      admin.requestId,
    ));
  }
}
