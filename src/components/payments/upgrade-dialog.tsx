"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { ApiErrorNotice } from "@/components/dashboard/api-error-notice";
import { PaymentMethodSelector } from "@/components/payments/payment-method-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/lib/api/client";
import { finishSingleFlight, tryStartSingleFlight } from "@/lib/actions/single-flight";
import { cn } from "@/lib/utils";
import {
  getChannelById,
  getChannelCategoryColors,
  type PaymentChannel,
} from "@/lib/payments/payment-channels";
import {
  getPaymentCreateEndpoint,
  getPaymentRedirectUrl,
  type PaymentCreateResponseData,
} from "@/lib/payments/checkout-client";
import { calculatePlanAmountUsd } from "@/lib/payments/pricing";
import type { PaidPlan, PaymentDuration } from "@/lib/validations/payment";

type UpgradeStep = "plan" | "method" | "confirm" | "processing";

type UpgradeDialogProps = {
  duration?: PaymentDuration;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  plan: PaidPlan;
};

const STEP_ORDER: UpgradeStep[] = ["plan", "method", "confirm", "processing"];
const DEFAULT_CHANNEL = getChannelById("qris_gopay");

export function getUpgradePlanLabel(plan: PaidPlan): string {
  return plan === "BUSINESS" ? "Business" : "Pro";
}

export function getUpgradeDurationLabel(duration: PaymentDuration): string {
  return duration === "YEARLY" ? "Yearly" : "Monthly";
}

export function formatUpgradeAmount(
  plan: PaidPlan,
  duration: PaymentDuration,
): string {
  return `$${calculatePlanAmountUsd({ duration, plan })}`;
}

function getStepPosition(step: UpgradeStep): number {
  return STEP_ORDER.indexOf(step) + 1;
}

function shouldConfirmClose(step: UpgradeStep): boolean {
  return step === "method" || step === "confirm";
}

function getDefaultChannel(): PaymentChannel {
  if (!DEFAULT_CHANNEL) {
    throw new Error("Default QRIS GoPay payment channel is not configured.");
  }

  return DEFAULT_CHANNEL;
}

function StepMarker({
  active,
  complete,
  label,
}: {
  active: boolean;
  complete: boolean;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
          active || complete
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {complete ? <CheckCircle2 className="size-3.5" /> : null}
      </span>
      <span
        className={cn(
          "truncate text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function UpgradeDialog({
  duration = "MONTHLY",
  onOpenChange,
  open,
  plan,
}: UpgradeDialogProps) {
  const submitGuard = useRef(false);
  const [step, setStep] = useState<UpgradeStep>("plan");
  const [selectedChannel, setSelectedChannel] =
    useState<PaymentChannel>(getDefaultChannel);
  const [submitError, setSubmitError] = useState<unknown | null>(null);
  const planLabel = getUpgradePlanLabel(plan);
  const durationLabel = getUpgradeDurationLabel(duration);
  const amount = formatUpgradeAmount(plan, duration);
  const isSubmitting = step === "processing";
  const channelColors = getChannelCategoryColors(selectedChannel.category);

  function resetDialogState() {
    setStep("plan");
    setSelectedChannel(getDefaultChannel());
    setSubmitError(null);
  }

  function requestClose(): boolean {
    if (isSubmitting) return false;
    if (!shouldConfirmClose(step)) return true;
    if (typeof window === "undefined") return true;

    return window.confirm("Close checkout? Your payment selection will be reset.");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && !requestClose()) return;

    if (!nextOpen) resetDialogState();
    onOpenChange(nextOpen);
  }

  function handleBack() {
    setSubmitError(null);
    if (step === "confirm") setStep("method");
    if (step === "method") setStep("plan");
  }

  async function handleCreatePayment() {
    if (!tryStartSingleFlight(submitGuard)) return;

    setSubmitError(null);
    setStep("processing");

    try {
      const payment = await apiFetch<PaymentCreateResponseData>(
        getPaymentCreateEndpoint(),
        {
          body: JSON.stringify({
            duration,
            paymentMethod: selectedChannel.id,
            plan,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        },
      );
      const redirectUrl = getPaymentRedirectUrl(payment);

      if (!redirectUrl) {
        throw new Error("Checkout did not return a redirect URL.");
      }

      window.location.assign(redirectUrl);
    } catch (err) {
      setSubmitError(err);
      setStep("confirm");
    } finally {
      finishSingleFlight(submitGuard);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="h-[100dvh] max-h-[100dvh] max-w-none gap-0 overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[min(90vh,760px)] sm:max-w-2xl sm:rounded-xl"
        showCloseButton={!isSubmitting}
      >
        <div className="flex h-full min-h-0 flex-col" aria-busy={isSubmitting}>
          <DialogHeader className="border-b p-4 pr-12 sm:p-5 sm:pr-12">
            <DialogTitle>Upgrade to {planLabel}</DialogTitle>
            <DialogDescription>
              Confirm the plan, choose a payment method, then continue to
              checkout.
            </DialogDescription>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <StepMarker
                active={step === "plan"}
                complete={getStepPosition(step) > 1}
                label="Plan"
              />
              <StepMarker
                active={step === "method"}
                complete={getStepPosition(step) > 2}
                label="Method"
              />
              <StepMarker
                active={step === "confirm" || step === "processing"}
                complete={false}
                label="Confirm"
              />
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div
              key={step}
              className="animate-in fade-in-0 slide-in-from-right-2 duration-150"
            >
              {step === "plan" ? (
                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="mt-1 text-lg font-semibold">
                          LinkSnap {planLabel}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {durationLabel} subscription, paid securely through
                          supported Indonesian payment channels.
                        </p>
                      </div>
                      <Badge variant="secondary">{durationLabel}</Badge>
                    </div>
                    <Separator className="my-4" />
                    <SummaryRow
                      label="Amount"
                      value={`${amount}${duration === "MONTHLY" ? " / month" : " / year"}`}
                    />
                  </div>
                  <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <p>
                      Your plan activates after the payment provider confirms
                      settlement.
                    </p>
                  </div>
                </div>
              ) : null}

              {step === "method" ? (
                <PaymentMethodSelector
                  continueLabel="Review upgrade"
                  onContinue={(channel) => {
                    setSelectedChannel(channel);
                    setSubmitError(null);
                    setStep("confirm");
                  }}
                  onSelectedChannelChange={setSelectedChannel}
                  selectedChannelId={selectedChannel.id}
                />
              ) : null}

              {step === "confirm" ? (
                <div className="space-y-4">
                  {submitError ? (
                    <ApiErrorNotice
                      error={submitError}
                      onRetry={() => void handleCreatePayment()}
                      title="Checkout failed"
                    />
                  ) : null}
                  <div className="rounded-lg border p-4">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Summary</p>
                        <p className="mt-1 text-lg font-semibold">
                          LinkSnap {planLabel}
                        </p>
                      </div>
                      <Badge className={channelColors.badgeClassName}>
                        {selectedChannel.shortName}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <SummaryRow label="Billing" value={durationLabel} />
                      <SummaryRow
                        label="Payment method"
                        value={selectedChannel.name}
                      />
                      <SummaryRow label="Processing" value={selectedChannel.estimatedProcessingTime} />
                      <Separator />
                      <SummaryRow label="Total" value={amount} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected to the checkout status page after the
                    transaction is created.
                  </p>
                </div>
              ) : null}

              {step === "processing" ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Loader2 className="size-6 animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium">Starting checkout</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Creating a secure payment for {selectedChannel.name}.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="m-0 shrink-0 rounded-none border-t bg-muted/40 p-4">
            {step === "plan" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => setStep("method")}>
                  Choose payment method
                </Button>
              </>
            ) : null}

            {step === "method" ? (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : null}

            {step === "confirm" ? (
              <>
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreatePayment()}
                  disabled={isSubmitting}
                >
                  Start checkout
                </Button>
              </>
            ) : null}

            {step === "processing" ? (
              <Button type="button" disabled>
                <Loader2 className="size-4 animate-spin" />
                Starting checkout
              </Button>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
