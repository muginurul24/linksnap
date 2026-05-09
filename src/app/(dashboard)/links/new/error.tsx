"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function NewLinkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/links", label: "Back to links" }}
      description="The form could not load right now. Try again, or return to your links while we recover this view."
      error={error}
      logKey="new_link_error_boundary"
      reset={reset}
      title="Link creation is temporarily unavailable"
    />
  );
}
