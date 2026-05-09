"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

export default function CampaignDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("campaign_detail_page_error_boundary", {
      digest: error.digest,
      message: error.message,
      name: error.name,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium">
          Campaign analytics are temporarily unavailable
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          This campaign page could not load. Try again, or return to campaigns
          while we recover this view.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Request ID: {error.digest}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()} size="sm" type="button" variant="outline">
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/campaigns" />}
          size="sm"
          variant="outline"
        >
          <ArrowLeft className="size-4" />
          Back to campaigns
        </Button>
      </div>
    </div>
  );
}
