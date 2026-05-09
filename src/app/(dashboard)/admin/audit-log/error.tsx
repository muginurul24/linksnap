"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function AdminAuditLogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/admin", label: "Back to admin" }}
      description="An error occurred while loading the audit trail. This might be a temporary database issue."
      error={error}
      logKey="admin_audit_log_error_boundary"
      reset={reset}
      title="Audit log is temporarily unavailable"
    />
  );
}
