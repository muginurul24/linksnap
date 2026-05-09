"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/observability/logger";

type RouteErrorAction = {
  href: string;
  label: string;
  showBackIcon?: boolean;
  variant?: "default" | "outline";
};

type DashboardRouteErrorStateProps = {
  action: RouteErrorAction;
  description: string;
  error: Error & { digest?: string };
  heading?: {
    description?: string;
    title: string;
  };
  logKey: string;
  reset: () => void;
  title: string;
};

export function DashboardRouteErrorState({
  action,
  description,
  error,
  heading,
  logKey,
  reset,
  title,
}: DashboardRouteErrorStateProps) {
  useEffect(() => {
    logger.error(logKey, {
      digest: error.digest,
      message: error.message,
      name: error.name,
    });
  }, [error, logKey]);

  return (
    <>
      {heading ? (
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{heading.title}</h1>
          {heading.description ? (
            <p className="text-sm text-muted-foreground">
              {heading.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {description}
          </p>
          {error.digest ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Request ID: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()} size="sm" type="button" variant="outline">
            <RotateCcw aria-hidden="true" className="size-4" />
            Try again
          </Button>
          <Button
            nativeButton={false}
            render={<Link href={action.href} />}
            size="sm"
            variant={action.variant ?? "outline"}
          >
            {action.showBackIcon === false ? null : (
              <ArrowLeft aria-hidden="true" className="size-4" />
            )}
            {action.label}
          </Button>
        </div>
      </div>
    </>
  );
}
