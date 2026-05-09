"use client";

import { DashboardRouteErrorState } from "@/components/dashboard/route-error-state";

export default function QrError({
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
      description="Your QR codes could not load. Try again, or create a link to generate a new QR code."
      error={error}
      logKey="qr_page_error_boundary"
      reset={reset}
      title="QR Codes are temporarily unavailable"
    />
  );
}
