"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ApiErrorNotice } from "@/components/dashboard/api-error-notice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api/client";
import { finishSingleFlight, tryStartSingleFlight } from "@/lib/actions/single-flight";

type SubscriptionAction = "cancel" | "reactivate";

type SubscriptionActionsProps = {
  currentPeriodEnd: string | null;
  status: string | null;
};

const actionConfig = {
  cancel: {
    endpoint: "/api/v1/payments/subscriptions/cancel",
    success: "Subscription renewal canceled.",
    title: "Cancel renewal?",
  },
  reactivate: {
    endpoint: "/api/v1/payments/subscriptions/reactivate",
    success: "Subscription reactivated.",
    title: "Reactivate subscription?",
  },
} as const;

function formatPeriodEnd(value: string | null): string {
  if (!value) return "the current period";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function SubscriptionActions({
  currentPeriodEnd,
  status,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const submitGuard = useRef(false);
  const [action, setAction] = useState<SubscriptionAction | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canCancel = status === "ACTIVE";
  const canReactivate = status === "CANCELED";
  const config = action ? actionConfig[action] : null;

  function closeDialog() {
    if (isSubmitting) return;
    setAction(null);
    setError(null);
  }

  async function submitAction() {
    if (!action || !config || !tryStartSingleFlight(submitGuard)) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(config.endpoint, { method: "POST" });
      toast.success(config.success);
      setAction(null);
      router.refresh();
    } catch (err) {
      setError(err);
    } finally {
      finishSingleFlight(submitGuard);
      setIsSubmitting(false);
    }
  }

  if (!canCancel && !canReactivate) return null;

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAction("cancel")}
          >
            <XCircle className="size-4" />
            Cancel renewal
          </Button>
        ) : null}
        {canReactivate ? (
          <Button type="button" onClick={() => setAction("reactivate")}>
            <RotateCcw className="size-4" />
            Reactivate
          </Button>
        ) : null}
      </div>

      <Dialog open={action !== null} onOpenChange={(open) => {
        if (!open) closeDialog();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config?.title ?? "Update subscription"}</DialogTitle>
            <DialogDescription>
              {action === "cancel"
                ? `Your paid access stays active until ${formatPeriodEnd(currentPeriodEnd)}.`
                : `Your plan will continue after ${formatPeriodEnd(currentPeriodEnd)}.`}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <ApiErrorNotice error={error} title="Subscription update failed" />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={isSubmitting}
            >
              Keep current setting
            </Button>
            <Button
              type="button"
              onClick={() => void submitAction()}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
