"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/dashboard", label: "Back to dashboard" }}
      description="An error occurred while loading the admin panel. This might be a temporary issue."
      error={error}
      logKey="admin_error_boundary"
      reset={reset}
      title="Admin panel is temporarily unavailable"
    />
  );
}
