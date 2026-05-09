"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/settings", label: "Back to settings" }}
      description="We could not load your plan or payment history. Try again, or return to settings while we recover this view."
      error={error}
      logKey="billing_page_error_boundary"
      reset={reset}
      title="Billing is temporarily unavailable"
    />
  );
}
