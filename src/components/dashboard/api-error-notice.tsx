"use client";

import { AlertTriangle, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFriendlyApiErrorMessage,
  isApiClientError,
} from "@/lib/api/client";
import { cn } from "@/lib/utils";

export type ApiErrorNoticeProps = {
  className?: string;
  error: unknown;
  onRetry?: () => void;
  title?: string;
};

export function getApiErrorRequestId(error: unknown): string | null {
  return isApiClientError(error) ? error.requestId : null;
}

export function ApiErrorNotice({
  className,
  error,
  onRetry,
  title = "Action failed",
}: ApiErrorNoticeProps) {
  const requestId = getApiErrorRequestId(error);
  const message = getFriendlyApiErrorMessage(error);

  const copyRequestId = () => {
    if (!requestId || typeof navigator === "undefined") return;
    void navigator.clipboard?.writeText(requestId);
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive",
        className,
      )}
      role="alert"
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-destructive/85">{message}</p>
          </div>
          {requestId ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-destructive/80">
              <span className="font-mono">Request ID: {requestId}</span>
              <Button
                aria-label="Copy request ID"
                onClick={copyRequestId}
                size="xs"
                type="button"
                variant="outline"
              >
                <Copy className="size-3" />
                Copy
              </Button>
            </div>
          ) : null}
          {onRetry ? (
            <Button onClick={onRetry} size="sm" type="button" variant="outline">
              <RefreshCw className="size-3.5" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
