"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Clock3,
  CreditCard,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message: string;
      };
      success: false;
    };

type PayGateVaNumber = {
  bank: string;
  va_number: string;
};

type PaymentLookupData = {
  amount: number;
  currency?: string;
  expires_at?: string;
  localStatus?: string;
  midtrans?: {
    va_numbers?: PayGateVaNumber[];
  };
  order_id: string;
  paid_at?: string;
  payment_type: string;
  status: string;
  transaction_id: string;
};

type CheckoutStatusClientProps = {
  orderId: string;
};

function formatAmount(amount: number, currency = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "Awaiting payment confirmation";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Awaiting payment confirmation";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function isPaidStatus(transaction: PaymentLookupData | null): boolean {
  if (!transaction) return false;

  return (
    transaction.status.toLowerCase() === "paid" ||
    transaction.localStatus === "SETTLEMENT"
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-10 w-44" />
    </div>
  );
}

export function CheckoutStatusClient({ orderId }: CheckoutStatusClientProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transaction, setTransaction] = useState<PaymentLookupData | null>(null);

  const loadTransaction = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/payments/${encodeURIComponent(orderId)}`,
        { cache: "no-store" },
      );
      const body = (await response.json()) as ApiEnvelope<PaymentLookupData>;

      if (!response.ok || !body.success) {
        setError(body.success ? "Unable to load payment details." : body.error.message);
        return;
      }

      setTransaction(body.data);
      setError(null);
    } catch {
      setError("Unable to load payment details.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTransaction();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadTransaction]);

  useEffect(() => {
    if (isPaidStatus(transaction)) return;

    const intervalId = window.setInterval(() => {
      void loadTransaction();
    }, 10_000);

    return () => window.clearInterval(intervalId);
  }, [loadTransaction, transaction]);

  useEffect(() => {
    if (!isPaidStatus(transaction)) return;

    const timeoutId = window.setTimeout(() => {
      window.location.assign("/settings/billing?refresh=plan");
    }, 1_200);

    return () => window.clearTimeout(timeoutId);
  }, [transaction]);

  const vaNumber = transaction?.midtrans?.va_numbers?.[0] ?? null;
  const statusLabel = transaction
    ? formatStatus(transaction.localStatus ?? transaction.status)
    : "Loading";
  const amountText = useMemo(
    () =>
      transaction
        ? formatAmount(transaction.amount, transaction.currency ?? "IDR")
        : "",
    [transaction],
  );

  const copyVaNumber = async () => {
    if (!vaNumber) return;

    await navigator.clipboard.writeText(vaNumber.va_number);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Checkout complete</CardTitle>
            <CardDescription>
              Finish the bank transfer from your virtual account.
            </CardDescription>
          </div>
          <Badge variant={isPaidStatus(transaction) ? "default" : "secondary"}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-destructive">
              <AlertCircle className="size-4" />
              Payment details unavailable
            </div>
            <p className="text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" onClick={() => void loadTransaction()}>
              <RefreshCw className="size-4" />
              Retry
            </Button>
          </div>
        ) : transaction ? (
          <>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {vaNumber ? `${vaNumber.bank.toUpperCase()} virtual account` : "Virtual account"}
                  </p>
                  <p className="mt-2 break-all font-mono text-2xl font-semibold">
                    {vaNumber?.va_number ?? "Waiting for VA number"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyVaNumber()}
                  disabled={!vaNumber}
                >
                  <Clipboard className="size-4" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Amount
                </dt>
                <dd className="mt-1 text-base font-semibold">{amountText}</dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Payment type
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {formatStatus(transaction.payment_type)}
                </dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Expires
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {formatDateTime(transaction.expires_at)}
                </dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Order ID
                </dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {transaction.order_id}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
              {isPaidStatus(transaction) ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              ) : (
                <Clock3 className="size-4 shrink-0 text-primary" />
              )}
              <p>
                {isPaidStatus(transaction)
                  ? "Payment confirmed. Billing will refresh automatically."
                  : "Payment status refreshes every 10 seconds after transfer."}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/dashboard?refresh=plan" variant="default">
                <LayoutDashboard className="size-4" />
                Go to Dashboard
              </ButtonLink>
              <ButtonLink href="/settings/billing?refresh=plan" variant="outline">
                <CreditCard className="size-4" />
                View Billing
              </ButtonLink>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
