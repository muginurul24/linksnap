"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

export default function LinkPagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("link_pages_render_error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex min-h-[360px] items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Link Pages could not load</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try again, or create a new Link Page if this view stays unavailable.
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={reset} type="button" variant="outline">
            <RefreshCw className="size-4" />
            Retry
          </Button>
          <Button nativeButton={false} render={<Link href="/links/new" />}>
            Create Link Page
          </Button>
        </div>
      </div>
    </div>
  );
}
