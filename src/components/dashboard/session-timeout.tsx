"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SESSION_TIMEOUT_WARNING_MS = 5 * 60 * 1000;
const SESSION_TIMEOUT_POLL_MS = 30 * 1000;

export type SessionTimeoutState = {
  expired: boolean;
  remainingMs: number;
  shouldWarn: boolean;
};

export function getSessionTimeoutState({
  expiresAt,
  now = Date.now(),
}: {
  expiresAt: string | null;
  now?: number;
}): SessionTimeoutState {
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  if (!Number.isFinite(expiresAtMs)) {
    return { expired: false, remainingMs: Number.POSITIVE_INFINITY, shouldWarn: false };
  }

  const remainingMs = Math.max(0, expiresAtMs - now);

  return {
    expired: remainingMs <= 0,
    remainingMs,
    shouldWarn: remainingMs > 0 && remainingMs <= SESSION_TIMEOUT_WARNING_MS,
  };
}

export function formatSessionRemaining(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function SessionTimeout({ expiresAt }: { expiresAt: string | null }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [isExtending, setIsExtending] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const timeoutState = useMemo(
    () => getSessionTimeoutState({ expiresAt, now }),
    [expiresAt, now],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, SESSION_TIMEOUT_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!timeoutState.shouldWarn && !timeoutState.expired) return null;

  async function extendSession() {
    setIsExtending(true);
    router.refresh();
    window.setTimeout(() => {
      setNow(Date.now());
      setIsExtending(false);
    }, 500);
  }

  async function signOutNow() {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] rounded-lg border bg-background p-4 shadow-lg sm:w-96">
      <div className="flex gap-3">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium">
              {timeoutState.expired ? "Session expired" : "Session expiring soon"}
            </p>
            <p className="text-xs text-muted-foreground">
              {timeoutState.expired
                ? "Sign in again to continue working."
                : `Time remaining: ${formatSessionRemaining(timeoutState.remainingMs)}`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {!timeoutState.expired ? (
              <Button
                aria-busy={isExtending}
                disabled={isExtending || isSigningOut}
                onClick={() => void extendSession()}
                size="sm"
                type="button"
              >
                {isExtending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Extend Session
              </Button>
            ) : null}
            <Button
              aria-busy={isSigningOut}
              disabled={isSigningOut}
              onClick={() => void signOutNow()}
              size="sm"
              type="button"
              variant="outline"
            >
              {isSigningOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
