"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/dashboard", label: "Back to dashboard" }}
      description="We could not load your campaigns. Try again, or return to the dashboard while we recover this view."
      error={error}
      logKey="campaigns_page_error_boundary"
      reset={reset}
      title="Campaigns are temporarily unavailable"
    />
  );
}
