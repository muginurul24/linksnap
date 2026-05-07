import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, CreditCard, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  findCheckoutTransactionByOrderId,
  findSubscriptionByUserId,
  type CheckoutTransactionSummary,
  type SubscriptionRecord,
} from "@/lib/db/queries/payments";
import type { UserPlan } from "@/lib/links/limits";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";
import { getPlanDefinition } from "@/lib/plans/definitions";
import { createPublicMetadata } from "@/lib/seo/metadata";
import { checkoutSuccessQuerySchema } from "@/lib/validations/payment";

type CheckoutSuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

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

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getFirstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDuration(duration: string): string {
  if (duration === "YEARLY") return "Yearly";
  if (duration === "MONTHLY") return "Monthly";

  return duration
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(status: CheckoutTransactionSummary["status"]): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getNextBillingText(
  subscription: SubscriptionRecord | null,
  transaction: CheckoutTransactionSummary,
): string {
  if (
    subscription?.status === "ACTIVE" &&
    subscription.plan === transaction.plan &&
    subscription.currentPeriodEnd
  ) {
    return formatDate(subscription.currentPeriodEnd);
  }

  return "Pending payment confirmation";
}

function getPlanName(plan: UserPlan): string {
  return `${getPlanDefinition(plan).name} Plan`;
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

  await syncSubscriptionStatusForUser(userId);

  const [transaction, subscription] = await Promise.all([
    findCheckoutTransactionByOrderId({
      orderId: parsedParams.data.order_id,
      userId,
    }),
    findSubscriptionByUserId(userId),
  ]);

  if (!transaction) return <CheckoutUnavailable />;

  const planName = getPlanName(transaction.plan);
  const nextBillingText = getNextBillingText(subscription, transaction);

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="size-4 text-emerald-500" />
          LinkSnap checkout
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Checkout complete</CardTitle>
                <CardDescription>
                  Your {planName} checkout has returned from Midtrans.
                </CardDescription>
              </div>
              <Badge variant={transaction.status === "SETTLEMENT" ? "default" : "secondary"}>
                {formatStatus(transaction.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Plan
                </dt>
                <dd className="mt-1 text-base font-semibold">{planName}</dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Billing cycle
                </dt>
                <dd className="mt-1 text-base font-semibold">
                  {formatDuration(transaction.duration)}
                </dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Next billing date
                </dt>
                <dd className="mt-1 text-base font-semibold">{nextBillingText}</dd>
              </div>
              <div className="rounded-lg border p-4">
                <dt className="text-xs font-medium uppercase text-muted-foreground">
                  Order ID
                </dt>
                <dd className="mt-1 break-all font-mono text-sm">
                  {transaction.orderId}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center">
              <Clock3 className="size-4 shrink-0 text-primary" />
              <p>
                Subscription activation is finalized by the Midtrans webhook. If
                this page still shows pending, refresh billing in a moment.
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
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
