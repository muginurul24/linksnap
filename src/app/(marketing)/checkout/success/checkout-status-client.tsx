"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import {
  PaymentInstructionsBank,
  type BankVaNumber,
} from "@/components/payments/payment-instructions-bank";
import { PaymentInstructionsCstore } from "@/components/payments/payment-instructions-cstore";
import { PaymentInstructionsEwallet } from "@/components/payments/payment-instructions-ewallet";
import { PaymentInstructionsQris } from "@/components/payments/payment-instructions-qris";
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
import {
  getChannelById,
  type PaymentChannel,
} from "@/lib/payments/payment-channels";
import type { PayGatePaymentAction } from "@/lib/payments/paygate";

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        message: string;
      };
      success: false;
    };

type PaymentLookupData = {
  actions?: PayGatePaymentAction[];
  amount: number;
  cstore?: string;
  currency?: string;
  expires_at?: string;
  localStatus?: string;
  midtrans?: {
    actions?: PayGatePaymentAction[];
    cstore?: string;
    payment_code?: string;
    qr_string?: string;
    qr_url?: string;
    va_numbers?: BankVaNumber[];
  };
  order_id: string;
  paid_at?: string | null;
  payment_code?: string;
  payment_method?: string;
  payment_type: string;
  qr_string?: string;
  qr_url?: string;
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

export function getExpirationCountdown(
  expiresAt: string | undefined,
  nowMs: number,
): string {
  if (!expiresAt) return "Awaiting expiry window";

  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return "Awaiting expiry window";

  const remainingSeconds = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
  if (remainingSeconds <= 0) return "Expired";

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function isPaidStatus(transaction: PaymentLookupData | null): boolean {
  if (!transaction) return false;

  return (
    transaction.status.toLowerCase() === "paid" ||
    transaction.localStatus === "SETTLEMENT"
  );
}

function getVaNumber(transaction: PaymentLookupData | null): BankVaNumber | null {
  return transaction?.midtrans?.va_numbers?.[0] ?? null;
}

function getPaymentActions(transaction: PaymentLookupData): PayGatePaymentAction[] {
  return transaction.actions ?? transaction.midtrans?.actions ?? [];
}

function getActionUrl(
  transaction: PaymentLookupData,
  predicate: (action: PayGatePaymentAction) => boolean,
): string | null {
  return getPaymentActions(transaction).find((action) => action.url && predicate(action))
    ?.url ?? null;
}

function getPaymentCode(transaction: PaymentLookupData): string | null {
  return transaction.payment_code ?? transaction.midtrans?.payment_code ?? null;
}

function getQrUrl(transaction: PaymentLookupData): string | null {
  return (
    transaction.qr_url ??
    transaction.midtrans?.qr_url ??
    getActionUrl(transaction, (action) => {
      const name = action.name?.toLowerCase() ?? "";
      const type = action.type?.toLowerCase() ?? "";

      return name.includes("qr") || type.includes("qr");
    })
  );
}

function getQrString(transaction: PaymentLookupData): string | null {
  return transaction.qr_string ?? transaction.midtrans?.qr_string ?? null;
}

function getPaymentChannelId(transaction: PaymentLookupData): string {
  if (transaction.payment_method) return transaction.payment_method;

  const paymentType = transaction.payment_type.toLowerCase();
  if (paymentType === "bank_transfer") {
    return getVaNumber(transaction)?.bank.toLowerCase() ?? "bni";
  }

  if (paymentType === "cstore") {
    return (
      transaction.cstore ??
      transaction.midtrans?.cstore ??
      (getPaymentCode(transaction) ? "indomaret" : "alfamart")
    );
  }

  if (paymentType === "qris") return "qris_gopay";

  return paymentType;
}

function getCheckoutDescription(channel: PaymentChannel | null): string {
  if (!channel) return "Review the payment status from your checkout provider.";

  if (channel.category === "bank_transfer") {
    return "Finish the bank transfer from your virtual account.";
  }
  if (channel.category === "ewallet") {
    return `Complete the payment approval in your ${channel.shortName} app.`;
  }
  if (channel.category === "qris") {
    return "Scan the QRIS code to finish payment.";
  }

  return `Pay at the nearest ${channel.shortName} cashier.`;
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

function PaymentInstructions({
  channel,
  transaction,
}: {
  channel: PaymentChannel | null;
  transaction: PaymentLookupData;
}) {
  if (!channel) {
    return (
      <section className="rounded-lg border bg-muted/30 p-4" aria-label="Payment instructions">
        <p className="font-semibold">Follow your payment provider instructions</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment details are still syncing. Keep this page open while status
          refreshes.
        </p>
      </section>
    );
  }

  if (channel.category === "bank_transfer") {
    return (
      <PaymentInstructionsBank
        channel={channel}
        vaNumber={getVaNumber(transaction)}
      />
    );
  }

  if (channel.category === "ewallet") {
    return (
      <PaymentInstructionsEwallet
        actions={getPaymentActions(transaction)}
        channel={channel}
      />
    );
  }

  if (channel.category === "qris") {
    return (
      <PaymentInstructionsQris
        channel={channel}
        qrString={getQrString(transaction)}
        qrUrl={getQrUrl(transaction)}
      />
    );
  }

  return (
    <PaymentInstructionsCstore
      channel={channel}
      paymentCode={getPaymentCode(transaction)}
    />
  );
}

export function CheckoutStatusClient({ orderId }: CheckoutStatusClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
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
    if (!transaction?.expires_at || isPaidStatus(transaction)) return;

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => window.clearInterval(intervalId);
  }, [transaction]);

  useEffect(() => {
    if (!isPaidStatus(transaction)) return;

    const timeoutId = window.setTimeout(() => {
      window.location.assign("/settings/billing?refresh=plan");
    }, 1_200);

    return () => window.clearTimeout(timeoutId);
  }, [transaction]);

  const channel = useMemo(() => {
    if (!transaction) return null;

    return getChannelById(getPaymentChannelId(transaction)) ?? null;
  }, [transaction]);
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
  const countdownText = transaction
    ? getExpirationCountdown(transaction.expires_at, nowMs)
    : "Loading";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Checkout complete</CardTitle>
            <CardDescription>{getCheckoutDescription(channel)}</CardDescription>
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
            <PaymentInstructions channel={channel} transaction={transaction} />

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Amount
                </dt>
                <dd className="mt-1 text-base font-semibold">{amountText}</dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Payment method
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {channel?.name ?? formatStatus(transaction.payment_type)}
                </dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Expires
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {formatDateTime(transaction.expires_at)}
                </dd>
                <dd className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {countdownText}
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
                  : "Payment status refreshes every 10 seconds after payment."}
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
