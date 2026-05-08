import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { checkoutSuccessQuerySchema } from "@/lib/validations/payment";
import { CheckoutStatusClient } from "./checkout-status-client";

type CheckoutSuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const description =
  "Review your LinkSnap checkout status and continue to your dashboard.";

export const metadata: Metadata = {
  ...createPublicMetadata({
    title: "Checkout complete",
    description,
    path: "/checkout/success",
    noIndex: true,
  }),
};

function getFirstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function CheckoutUnavailable() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="size-4 text-primary" />
          LinkSnap checkout
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Checkout details unavailable</CardTitle>
            <CardDescription>
              We could not match this checkout return to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink href="/settings/billing" variant="default">
              <CreditCard className="size-4" />
              Review Billing
            </ButtonLink>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const parsedParams = checkoutSuccessQuerySchema.safeParse({
    order_id: getFirstParam(params.order_id),
  });

  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    const callbackUrl = parsedParams.success
      ? `/checkout/success?order_id=${encodeURIComponent(parsedParams.data.order_id)}`
      : "/checkout/success";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (!parsedParams.success) return <CheckoutUnavailable />;

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CreditCard className="size-4 text-primary" />
          LinkSnap checkout
        </div>

        <CheckoutStatusClient orderId={parsedParams.data.order_id} />
      </section>
    </main>
  );
}
