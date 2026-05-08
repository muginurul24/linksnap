import { insertAdminAuditLog } from "@/lib/db/queries/admin-audit";
import { logger } from "@/lib/observability/logger";

export async function writeAdminAuditLog({
  action,
  adminUserId,
  metadata,
  targetUserId,
  ipAddress,
}: {
  action: string;
  adminUserId: string;
  metadata?: Record<string, unknown>;
  targetUserId?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await insertAdminAuditLog({
      action,
      adminUserId,
      metadata,
      targetUserId,
      ipAddress,
    });
  } catch (error) {
    // Audit log failures must never block admin actions
    logger.error("admin_audit_log_write_failed", { error, action, adminUserId });
  }
}
