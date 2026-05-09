import Image from "next/image";
import { QrCode } from "lucide-react";
import { PaymentCopyButton } from "@/components/payments/payment-copy-button";
import type { PaymentChannel } from "@/lib/payments/payment-channels";

type PaymentInstructionsQrisProps = {
  channel: PaymentChannel;
  qrString: string | null;
  qrUrl: string | null;
};

export function PaymentInstructionsQris({
  channel,
  qrString,
  qrUrl,
}: PaymentInstructionsQrisProps) {
  return (
    <section className="rounded-lg border bg-muted/30 p-4" aria-label="QRIS instructions">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border bg-background p-4 sm:w-44">
          {qrUrl ? (
            <Image
              src={qrUrl}
              alt="QRIS payment code"
              height={176}
              unoptimized
              width={176}
              className="size-full object-contain"
            />
          ) : (
            <QrCode className="size-20 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-semibold">Scan with any QRIS app</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {channel.instructions}
            </p>
          </div>
          {qrString ? (
            <div className="rounded-lg border bg-background p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                QR string
              </p>
              <p className="mt-1 break-all font-mono text-xs">{qrString}</p>
            </div>
          ) : null}
          <PaymentCopyButton
            disabled={!qrString}
            label="Copy QR string"
            value={qrString}
          />
        </div>
      </div>
    </section>
  );
}
