"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function AdminUserDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/admin/users", label: "Back to users" }}
      description="An error occurred while loading user information. The user may have been removed."
      error={error}
      logKey="admin_user_detail_error_boundary"
      reset={reset}
      title="User details are temporarily unavailable"
    />
  );
}
