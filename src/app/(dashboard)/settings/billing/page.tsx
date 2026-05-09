import { redirect } from "next/navigation";
import {
  Building,
  Building2,
  Check,
  Clock3,
  CreditCard,
  QrCode,
  Sparkles,
  Smartphone,
  Store,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SubscriptionActions } from "@/app/(dashboard)/settings/billing/subscription-actions";
import { UpgradeButton } from "@/app/(dashboard)/settings/billing/upgrade-button";
import { Badge } from "@/components/ui/badge";
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
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  findBillingUserById,
  findSubscriptionByUserId,
  listPaymentTransactionsByUserId,
  type BillingTransaction,
} from "@/lib/db/queries/payments";
import type { UserPlan } from "@/lib/links/limits";
import { getChannelById } from "@/lib/payments/payment-channels";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";
import {
  PLANS,
  formatUsdPrice,
  getPlanDefinition,
  type PlanDefinition,
} from "@/lib/plans/definitions";
import type { PaidPlan } from "@/lib/validations/payment";

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

type MethodDisplay = {
  Icon: LucideIcon;
  label: string;
};

const planIcons: Record<UserPlan, typeof Zap> = {
  FREE: Zap,
  PRO: Sparkles,
  BUSINESS: Building,
};

const methodIcons = {
  bank_transfer: Building2,
  convenience_store: Store,
  ewallet: Smartphone,
  qris: QrCode,
} as const;

const billingFaqs = [
  {
    answer:
      "Paid access activates after the payment provider confirms settlement. The checkout page refreshes status automatically.",
    question: "When does my plan activate?",
  },
  {
    answer:
      "Canceling stops renewal. Your paid access remains available until the current period ends.",
    question: "What happens when I cancel renewal?",
  },
  {
    answer:
      "Payment history is never cached as a mutation result. The billing page always reads the latest transaction state.",
    question: "Why is payment history sometimes still pending?",
  },
];

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

function formatPaymentMethodName(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

function getPaymentMethodDisplay(transaction: BillingTransaction): MethodDisplay {
  const method = transaction.paymentMethod?.trim();
  if (!method) return { Icon: Clock3, label: "Pending" };

  const channel = getChannelById(method);
  if (!channel) {
    return { Icon: CreditCard, label: formatPaymentMethodName(method) };
  }

  return {
    Icon: methodIcons[channel.category],
    label: channel.shortName,
  };
}

function getSubscriptionStatusLabel(status: string | null | undefined): string {
  if (!status) return "Free";
  if (status === "CANCELED") return "Canceling";

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function hasSubscriptionAction(status: string | null | undefined): boolean {
  return status === "ACTIVE" || status === "CANCELED";
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
  const paidAccess = billingUser.plan !== "FREE" && subscription !== null;
  const availableUpgrades = plans.filter(
    (plan) => plan.plan !== "FREE" && plan.plan !== billingUser.plan,
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your plan, checkout status, and payment history.
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">Current Plan</CardTitle>
              <CardDescription>
                {paidAccess
                  ? `Access through ${formatDate(subscription.currentPeriodEnd)}.`
                  : "You are currently on the Free plan."}
              </CardDescription>
            </div>
            <Badge variant={paidAccess ? "default" : "secondary"}>
              {getSubscriptionStatusLabel(subscription?.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-12 items-center justify-center rounded-lg bg-primary/10">
                <currentPlan.icon className="size-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{currentPlan.name} Plan</p>
                <p className="text-xs text-muted-foreground">
                  Period:{" "}
                  {paidAccess
                    ? `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}`
                    : "Not scheduled"}
                </p>
              </div>
            </div>
            {hasSubscriptionAction(subscription?.status) ? (
              <SubscriptionActions
                currentPeriodEnd={subscription?.currentPeriodEnd.toISOString() ?? null}
                status={subscription?.status ?? null}
              />
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Short links</p>
              <p className="mt-1 font-semibold">
                {Number.isFinite(currentPlan.limits.links)
                  ? currentPlan.limits.links
                  : "Unlimited"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Link Pages</p>
              <p className="mt-1 font-semibold">
                {Number.isFinite(currentPlan.limits.linkPages)
                  ? currentPlan.limits.linkPages
                  : "Unlimited"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Analytics retention</p>
              <p className="mt-1 font-semibold">
                {currentPlan.limits.analyticsRetentionDays} days
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">API requests</p>
              <p className="mt-1 font-semibold">
                {currentPlan.limits.apiRequestsPerMinute}/min
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Available upgrades</h2>
          <p className="text-sm text-muted-foreground">
            Upgrade when campaigns need more limits, retention, or automation.
          </p>
        </div>
        {availableUpgrades.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            You are already on the highest plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {availableUpgrades.map((plan) => (
              <Card key={plan.name}>
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
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <UpgradeButton current={false} plan={plan.plan as PaidPlan} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
          <CardDescription>
            Latest {history.items.length} of {history.total} payment transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.items.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No payments yet. Paid checkout attempts will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.items.map((transaction) => {
                    const method = getPaymentMethodDisplay(transaction);

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-muted-foreground">
                          {formatDate(transaction.paidAt ?? transaction.createdAt)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {transaction.orderId}
                        </TableCell>
                        <TableCell>
                          {transaction.plan} / {transaction.duration}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <method.Icon className="size-4" />
                            {method.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(transaction.status)}>
                            {formatPaymentStatus(transaction.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatCurrencyIdr(transaction.grossAmountIdr)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing FAQ</CardTitle>
          <CardDescription>
            Operational details for plan changes and payment status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {billingFaqs.map((faq) => (
            <div key={faq.question} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{faq.question}</p>
              <p className="mt-2 text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
