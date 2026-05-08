"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

export default function AdminUserDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("admin_user_detail_error_boundary", {
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
        <p className="text-sm font-medium">User details are temporarily unavailable</p>
        <p className="mt-1 text-sm text-muted-foreground">
          An error occurred while loading user information. The user may have been removed.
        </p>
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => reset()}>
          <RotateCcw className="size-4" />
          Try again
        </Button>
        <Button variant="outline" size="sm" render={<Link href="/admin/users" />}>
          <ArrowLeft className="size-4" />
          Back to users
        </Button>
      </div>
    </div>
  );
}
