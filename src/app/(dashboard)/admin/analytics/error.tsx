"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

export default function AdminAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("admin_analytics_error_boundary", {
      digest: error.digest,
      name: error.name,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium">System analytics are temporarily unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An error occurred while loading analytics data. Please try again.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Request ID: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => reset()}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin" />}>
          <ArrowLeft className="size-4" />
          Back to admin
        </Button>
      </div>
    </div>
  );
}
