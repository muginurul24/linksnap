"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function LinksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{
        href: "/links/new",
        label: "Create link",
        showBackIcon: false,
        variant: "default",
      }}
      description="Your links could not load. Try again, or create a new link if this view stays unavailable."
      error={error}
      logKey="links_page_error_boundary"
      reset={reset}
      title="Links are temporarily unavailable"
    />
  );
}
