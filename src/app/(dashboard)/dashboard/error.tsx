"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/links", label: "Open links" }}
      description="Your workspace overview could not load. Try again, or open your links while we recover this view."
      error={error}
      logKey="dashboard_overview_error_boundary"
      reset={reset}
      title="Dashboard is temporarily unavailable"
    />
  );
}
