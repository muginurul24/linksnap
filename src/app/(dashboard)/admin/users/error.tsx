"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function AdminUsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/admin", label: "Back to admin" }}
      description="An error occurred while loading user data. Please try again."
      error={error}
      logKey="admin_users_error_boundary"
      reset={reset}
      title="User management is temporarily unavailable"
    />
  );
}
