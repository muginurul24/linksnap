"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function NewCampaignError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/campaigns", label: "Back to campaigns" }}
      description="The campaign form could not load right now. Try again, or return to campaigns while we recover this view."
      error={error}
      logKey="new_campaign_error_boundary"
      reset={reset}
      title="Campaign creation is temporarily unavailable"
    />
  );
}
