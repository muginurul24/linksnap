"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function HelpError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{
        href: "mailto:support@justqiu.cloud",
        label: "Email Support",
        showBackIcon: false,
        variant: "default",
      }}
      description="The help center could not load. Try again, or email support if you need help right now."
      error={error}
      logKey="help_page_error_boundary"
      reset={reset}
      title="Help is temporarily unavailable"
    />
  );
}
