"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("settings_error_boundary", {
      digest: error.digest,
      name: error.name,
      message: error.message,
    });
  }, [error]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium">Settings are temporarily unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">
            An error occurred while loading settings. This might be a temporary database issue.
          </p>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => reset()}>
            <RotateCcw className="size-4" />
            Try again
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/dashboard" />}>
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Button>
        </div>
      </div>
    </>
  );
}
