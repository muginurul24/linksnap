"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function DocsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <DashboardRouteErrorState
      action={{ href: "/settings?tab=api", label: "Manage API keys" }}
      description="The API reference could not load. Try again, or manage your API keys while we recover this view."
      error={error}
      logKey="api_docs_error_boundary"
      reset={reset}
      title="API Docs are temporarily unavailable"
    />
  );
}
