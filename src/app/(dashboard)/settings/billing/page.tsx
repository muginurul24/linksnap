import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Building, Check, CreditCard, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/auth";
import {
  findBillingUserById,
  findSubscriptionByUserId,
  listPaymentTransactionsByUserId,
  type BillingTransaction,
} from "@/lib/db/queries/payments";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";
import {
  detectBillingClientCountry,
  getAvailablePaymentGateways,
} from "@/lib/payments/gateway-selection";
import type { UserPlan } from "@/lib/links/limits";
import {
  PLANS,
  formatUsdPrice,
  getPlanDefinition,
  type PlanDefinition,
} from "@/lib/plans/definitions";
import type { PaidPlan } from "@/lib/validations/payment";
import { UpgradeButton } from "./upgrade-button";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type BillingPageProps = {
  searchParams: Promise<{
    upgrade?: string | string[];
  }>;
};

type PlanCard = PlanDefinition & {
  icon: typeof Zap;
  period: string;
  plan: UserPlan;
  price: string;
};

const planIcons: Record<UserPlan, typeof Zap> = {
  FREE: Zap,
  PRO: Sparkles,
  BUSINESS: Building,
};

function toPlanCard(plan: PlanDefinition): PlanCard {
  return {
    ...plan,
    icon: planIcons[plan.id],
    period: plan.monthlyUsd === 0 ? "forever" : "per month",
    plan: plan.id,
    price: formatUsdPrice(plan.monthlyUsd),
  };
}

const plans: PlanCard[] = PLANS.map(toPlanCard);

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getUpgradeReason(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || null;
}

function getUpgradePrompt(upgradeReason: string | null): {
  description: string;
  title: string;
} | null {
  if (upgradeReason === "api-docs") {
    return {
      description:
        "Upgrade to unlock API docs, API key access, and advanced automation workflows.",
      title: "API documentation requires Pro or Business.",
    };
  }

  if (upgradeReason === "api-keys") {
    return {
      description:
        "Upgrade to create bearer API keys for integrations and automation.",
      title: "API keys require Pro or Business.",
    };
  }

  return null;
}

function formatDate(date: Date | null): string {
  if (!date) return "Not scheduled";

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCurrencyIdr(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function formatPaymentStatus(status: BillingTransaction["status"]): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusVariant(
  status: BillingTransaction["status"],
): "default" | "destructive" | "outline" | "secondary" {
  if (status === "SETTLEMENT") return "default";
  if (status === "PENDING") return "secondary";
  if (status === "CANCEL" || status === "DENY" || status === "EXPIRE") {
    return "destructive";
  }

  return "outline";
}

function getCurrentPlanConfig(plan: UserPlan): PlanCard {
  return toPlanCard(getPlanDefinition(plan));
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) redirect("/login");

  const params = await searchParams;
  const upgradeReason = getUpgradeReason(params.upgrade);
  await syncSubscriptionStatusForUser(userId);

  const [billingUser, subscription, history] = await Promise.all([
    findBillingUserById(userId),
    findSubscriptionByUserId(userId),
    listPaymentTransactionsByUserId({ limit: 10, page: 1, userId }),
  ]);

  if (!billingUser) redirect("/login");

  const currentPlan = getCurrentPlanConfig(billingUser.plan);
  const upgradePrompt = getUpgradePrompt(upgradeReason);
  const isActivePaidSubscription =
    subscription?.status === "ACTIVE" && billingUser.plan !== "FREE";
  const clientCountry = await detectBillingClientCountry(await headers());
  const availableGateways = getAvailablePaymentGateways(clientCountry);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and billing details.
        </p>
      </div>

      {upgradePrompt ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="text-sm font-medium">{upgradePrompt.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {upgradePrompt.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Plan</CardTitle>
          <CardDescription>
            {isActivePaidSubscription
              ? `Renews on ${formatDate(subscription.currentPeriodEnd)}.`
              : "You are currently on the Free plan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-primary/10">
                <currentPlan.icon className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{currentPlan.name} Plan</p>
                <p className="text-xs text-muted-foreground">
                  Next billing date:{" "}
                  {isActivePaidSubscription
                    ? formatDate(subscription.currentPeriodEnd)
                    : "Not scheduled"}
                </p>
              </div>
            </div>
            <Badge variant={isActivePaidSubscription ? "default" : "secondary"}>
              {subscription?.status === "ACTIVE" ? "Active" : "Free"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div
        className="grid gap-4 lg:grid-cols-3"
        data-client-country={clientCountry ?? "unknown"}
        data-payment-gateways={availableGateways.join(",")}
      >
        {plans.map((plan) => {
          const isCurrent = plan.plan === billingUser.plan;

          return (
            <Card
              key={plan.name}
              className={isCurrent ? "border-primary ring-1 ring-primary" : ""}
            >
              <CardHeader>
                <div className="mb-2 flex items-center gap-2">
                  <plan.icon className="size-5 text-primary" />
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.plan === "FREE" ? (
                  <Button className="w-full" disabled variant="secondary">
                    <CreditCard className="size-4" />
                    {isCurrent ? "Current Plan" : "Included"}
                  </Button>
                ) : (
                  <UpgradeButton
                    availableGateways={availableGateways}
                    current={isCurrent}
                    gateway={availableGateways[0]}
                    plan={plan.plan as PaidPlan}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing History</CardTitle>
          <CardDescription>
            Latest {history.items.length} of {history.total} payment transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No payments yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs">
                        {transaction.orderId}
                      </TableCell>
                      <TableCell>
                        {transaction.plan} / {transaction.duration}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(transaction.status)}>
                          {formatPaymentStatus(transaction.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.paymentMethod ?? "Pending"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrencyIdr(transaction.grossAmountIdr)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDate(transaction.paidAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
