import { Building2 } from "lucide-react";
import { PaymentCopyButton } from "@/components/payments/payment-copy-button";
import type { PaymentChannel } from "@/lib/payments/payment-channels";

export type BankVaNumber = {
  bank: string;
  va_number: string;
};

type PaymentInstructionsBankProps = {
  channel: PaymentChannel;
  vaNumber: BankVaNumber | null;
};

export function PaymentInstructionsBank({
  channel,
  vaNumber,
}: PaymentInstructionsBankProps) {
  return (
    <section className="rounded-lg border bg-muted/30 p-4" aria-label="Bank transfer instructions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background text-sm font-semibold">
            {channel.shortName.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Building2 className="size-3.5" />
              {vaNumber
                ? `${vaNumber.bank.toUpperCase()} virtual account`
                : `${channel.shortName} virtual account`}
            </div>
            <p className="mt-2 break-all font-mono text-2xl font-semibold">
              {vaNumber?.va_number ?? "Waiting for VA number"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {channel.instructions}
            </p>
          </div>
        </div>
        <PaymentCopyButton value={vaNumber?.va_number} />
      </div>
    </section>
  );
}
