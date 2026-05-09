import { ExternalLink, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentChannel } from "@/lib/payments/payment-channels";
import type { PayGatePaymentAction } from "@/lib/payments/paygate";

type PaymentInstructionsEwalletProps = {
  actions: PayGatePaymentAction[];
  channel: PaymentChannel;
};

function getActionUrl(actions: PayGatePaymentAction[]): string | null {
  return actions.find((action) => action.url)?.url ?? null;
}

export function PaymentInstructionsEwallet({
  actions,
  channel,
}: PaymentInstructionsEwalletProps) {
  const actionUrl = getActionUrl(actions);

  return (
    <section className="rounded-lg border bg-muted/30 p-4" aria-label="E-wallet instructions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Smartphone className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Complete in your {channel.shortName} app</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {channel.instructions}
            </p>
          </div>
        </div>
        {actionUrl ? (
          <Button render={<a href={actionUrl} rel="noreferrer" target="_blank" />}>
            <ExternalLink className="size-4" />
            Open {channel.shortName}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled>
            Waiting for wallet link
          </Button>
        )}
      </div>
    </section>
  );
}
