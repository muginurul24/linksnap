import type { Metadata } from "next";
import { CreditCard, RotateCcw, XCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { checkoutCancelQuerySchema } from "@/lib/validations/payment";

type CheckoutCancelPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const description =
  "Your LinkSnap checkout was cancelled before the subscription was activated.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Checkout cancelled",
    description,
    path: "/checkout/cancel",
    noIndex: true,
  }),
};

function getFirstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getCancelMessage(status: string | undefined): string {
  if (status === "error") {
    return "Payment failed before the subscription was activated.";
  }

  return "Payment was cancelled before the subscription was activated.";
}

export default async function CheckoutCancelPage({
  searchParams,
}: CheckoutCancelPageProps) {
  const params = await searchParams;
  const parsedParams = checkoutCancelQuerySchema.safeParse({
    order_id: getFirstParam(params.order_id),
    status: getFirstParam(params.status),
  });
  const orderId = parsedParams.success ? parsedParams.data.order_id : undefined;
  const status = parsedParams.success ? parsedParams.data.status : undefined;

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <XCircle className="size-4 text-destructive" />
          LinkSnap checkout
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment was cancelled</CardTitle>
            <CardDescription>{getCancelMessage(status)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {orderId ? (
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium uppercase text-muted-foreground">
                  Order ID
                </p>
                <p className="mt-1 break-all font-mono text-sm">{orderId}</p>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/settings/billing" variant="default">
                <RotateCcw className="size-4" />
                Try Again
              </ButtonLink>
              <ButtonLink href="/dashboard" variant="outline">
                <CreditCard className="size-4" />
                Go to Dashboard
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
