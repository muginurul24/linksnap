"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function AdminAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/admin", label: "Back to admin" }}
      description="An error occurred while loading analytics data. Please try again."
      error={error}
      logKey="admin_analytics_error_boundary"
      reset={reset}
      title="System analytics are temporarily unavailable"
    />
  );
}
