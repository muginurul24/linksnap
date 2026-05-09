import { Store } from "lucide-react";
import { PaymentCopyButton } from "@/components/payments/payment-copy-button";
import type { PaymentChannel } from "@/lib/payments/payment-channels";

type PaymentInstructionsCstoreProps = {
  channel: PaymentChannel;
  paymentCode: string | null;
};

export function PaymentInstructionsCstore({
  channel,
  paymentCode,
}: PaymentInstructionsCstoreProps) {
  return (
    <section className="rounded-lg border bg-muted/30 p-4" aria-label="Convenience store instructions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Store className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Show at {channel.shortName} cashier</p>
            <p className="mt-2 break-all font-mono text-2xl font-semibold">
              {paymentCode ?? "Waiting for payment code"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {channel.instructions}
            </p>
          </div>
        </div>
        <PaymentCopyButton value={paymentCode} />
      </div>
    </section>
  );
}
