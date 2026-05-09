"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CreditCard,
  Link2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ALL_PAYMENT_CHANNELS,
  CHANNELS_BY_CATEGORY,
  type PaymentChannelCategory,
} from "@/lib/payments/payment-channels";
import {
  PLAN_COMPARISON_ROWS,
  PLANS,
  formatUsdPrice,
  getYearlySavings,
  type PlanDefinition,
} from "@/lib/plans/definitions";
import type { UserPlan } from "@/lib/links/limits";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";

type Faq = {
  answer: ReactNode;
  question: string;
};

type PricingPageProps = {
  currentPlan?: UserPlan | null;
};

const categoryIcons: Record<PaymentChannelCategory, LucideIcon> = {
  bank_transfer: Building2,
  convenience_store: Store,
  ewallet: Smartphone,
  qris: QrCode,
};

const trustItems: Array<{ icon: LucideIcon; text: string }> = [
  {
    icon: ShieldCheck,
    text: "Signed payment webhooks and protected billing updates",
  },
  {
    icon: CreditCard,
    text: "Midtrans-powered monthly and yearly checkout",
  },
  {
    icon: Link2,
    text: "HTTP 308 redirects with analytics and QR tracking",
  },
];

const paymentMethodsLabel = ALL_PAYMENT_CHANNELS.map(
  (channel) => channel.shortName,
).join(", ");

const faqs: Faq[] = [
  {
    question: "What payment methods do you accept?",
    answer: (
      <>
        We accept 15 Indonesian payment methods through Midtrans:{" "}
        {paymentMethodsLabel}.
      </>
    ),
  },
  {
    question: "When does my subscription activate?",
    answer:
      "Your plan activates after the payment provider confirms settlement. The checkout page keeps refreshing status while you finish payment.",
  },
  {
    question: "Can I use LinkSnap before paying?",
    answer:
      "Yes. The Free plan includes real short links, Link Pages, Smart Rules, QR codes, and 30 days of analytics retention.",
  },
  {
    question: "What happens when I hit a plan limit?",
    answer:
      "Existing links keep working. Creating new links, pages, QR codes, or campaigns is limited until you upgrade or remove unused resources.",
  },
  {
    question: "Can I downgrade later?",
    answer:
      "You can move back to Free at the end of a billing period. Links above Free quotas remain accessible, but new premium resource creation is gated.",
  },
];

function formatPrice(plan: PlanDefinition, cycle: BillingCycle): string {
  const amount = cycle === "monthly" ? plan.monthlyUsd : plan.yearlyUsd;
  return formatUsdPrice(amount);
}

function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-background/95">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <Zap className="size-4" />
          </span>
          LinkSnap
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="font-medium text-foreground">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
        </nav>
      </Container>
    </header>
  );
}

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border bg-muted p-1"
      role="group"
      aria-label="Billing cycle"
    >
      {(["monthly", "yearly"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={cycle === value}
          className={cn(
            "h-9 rounded-md px-4 text-sm font-semibold capitalize transition",
            cycle === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(value)}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function getPlanCta({
  currentPlan,
  plan,
}: {
  currentPlan?: UserPlan | null;
  plan: PlanDefinition;
}): {
  href: string;
  label: string;
} {
  if (currentPlan) {
    return plan.id === currentPlan
      ? { href: "/settings/billing", label: "Manage current plan" }
      : { href: "/settings/billing", label: `Upgrade to ${plan.name}` };
  }

  return plan.id === "FREE"
    ? { href: "/register", label: "Start Free" }
    : { href: "/register", label: plan.cta };
}

function PlanCard({
  currentPlan,
  cycle,
  plan,
}: {
  currentPlan?: UserPlan | null;
  cycle: BillingCycle;
  plan: PlanDefinition;
}) {
  const price = formatPrice(plan, cycle);
  const period = cycle === "monthly" ? "month" : "year";
  const isCurrent = currentPlan === plan.id;
  const cta = getPlanCta({ currentPlan, plan });

  return (
    <article
      className={cn(
        "flex rounded-md border bg-card p-6 shadow-sm",
        plan.highlighted && "border-primary/50 bg-primary/5",
        isCurrent && "ring-2 ring-primary",
      )}
    >
      <div className="flex w-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {plan.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isCurrent ? <Badge>Current plan</Badge> : null}
            {plan.highlighted ? <Badge variant="secondary">Recommended</Badge> : null}
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{price}</span>
            <span className="text-sm text-muted-foreground">/{period}</span>
          </div>
          {cycle === "yearly" && getYearlySavings(plan) > 0 ? (
            <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-300">
              Save ${getYearlySavings(plan)} compared with monthly
            </p>
          ) : null}
        </div>
        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link
          href={cta.href}
          className={cn(
            "mt-7 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition",
            plan.highlighted
              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-background hover:bg-muted",
          )}
        >
          {cta.label}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </article>
  );
}

function ComparisonTable() {
  return (
    <section className="border-y bg-muted/40 py-16 sm:py-20">
      <Container>
        <div className="mb-8 max-w-3xl">
          <p className="text-sm font-semibold uppercase text-primary">
            Feature Comparison
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Compare the full plan limits
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Every plan uses the same redirect, analytics, QR, and Link Page
            engine. Upgrades increase volume, retention, and automation access.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="sticky left-0 z-10 bg-muted px-4 py-3 font-medium">
                  Feature
                </th>
                <th className="px-4 py-3 font-medium">Free</th>
                <th className="px-4 py-3 font-medium">Pro</th>
                <th className="px-4 py-3 font-medium">Business</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t">
                  <th className="sticky left-0 z-10 bg-background px-4 py-3 font-medium">
                    {row.feature}
                  </th>
                  <td className="px-4 py-3 text-muted-foreground">{row.free}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.pro}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.business}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </section>
  );
}

function PaymentTrustSection() {
  return (
    <section className="border-y bg-muted/40 py-12">
      <Container>
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">
              Payment methods
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              All payments securely processed
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              Checkout is handled through Midtrans-supported bank transfer,
              e-wallet, QRIS, and convenience-store channels.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(CHANNELS_BY_CATEGORY).map(([category, channels]) => {
              const typedCategory = category as PaymentChannelCategory;
              const Icon = categoryIcons[typedCategory];

              return (
                <div key={category} className="rounded-md border bg-background p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4 text-primary" />
                    {channels[0]?.categoryLabel ?? category}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {channels.map((channel) => (
                      <span
                        key={channel.id}
                        className="rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium"
                      >
                        {channel.shortName}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold">Pricing questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details key={faq.question} className="group rounded-md border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {faq.question}
                <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}

function Hero({
  cycle,
  onCycleChange,
}: {
  cycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
}) {
  const maxYearlySavings = useMemo(
    () => Math.max(...PLANS.map((plan) => getYearlySavings(plan))),
    [],
  );

  return (
    <section className="py-16 sm:py-22">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Free plan available without a credit card
          </p>
          <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">
            Pricing for smarter short links
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
            Pick the plan that matches your link volume, campaign workflow, API
            needs, and analytics retention window.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <BillingToggle cycle={cycle} onChange={onCycleChange} />
            <p className="text-sm text-muted-foreground">
              Yearly billing saves up to ${maxYearlySavings} per plan.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="border-y py-6">
      <Container className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
        {trustItems.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <Icon className="size-5 text-primary" />
            <span>{text}</span>
          </div>
        ))}
      </Container>
    </section>
  );
}

export default function PricingPage({ currentPlan = null }: PricingPageProps) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero cycle={cycle} onCycleChange={setCycle} />
      <Container className="grid gap-4 pb-16 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.name}
            currentPlan={currentPlan}
            plan={plan}
            cycle={cycle}
          />
        ))}
      </Container>
      <TrustBar />
      <PaymentTrustSection />
      <ComparisonTable />
      <FaqSection />
      <section className="bg-foreground py-14 text-background">
        <Container className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Start with Free today.</h2>
            <p className="mt-2 text-sm text-background/70">
              Upgrade only when your campaigns need higher limits.
            </p>
          </div>
          <Link
            href={currentPlan ? "/settings/billing" : "/register"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-background px-5 text-sm font-semibold text-foreground transition hover:bg-background/90"
          >
            {currentPlan ? "Manage Billing" : "Get Started Free"}
            <ArrowRight className="size-4" />
          </Link>
        </Container>
      </section>
    </main>
  );
}
