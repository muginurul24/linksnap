"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Link2,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  PLAN_COMPARISON_ROWS,
  PLANS,
  formatUsdPrice,
  getYearlySavings,
  type PlanDefinition,
} from "@/lib/plans/definitions";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";

type Faq = {
  question: string;
  answer: string;
};

const faqs: Faq[] = [
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
    question: "Do yearly plans charge through Midtrans?",
    answer:
      "Yes. Checkout uses Midtrans Snap, and successful payments activate the selected monthly or yearly subscription period.",
  },
  {
    question: "Can I downgrade later?",
    answer:
      "You can move back to Free at the end of a billing period. Links above Free quotas remain accessible, but new premium resource creation is gated.",
  },
];

const trustItems: Array<{ icon: LucideIcon; text: string }> = [
  {
    icon: ShieldCheck,
    text: "Secure auth, ownership checks, and signed webhooks",
  },
  {
    icon: CreditCard,
    text: "Midtrans Snap checkout for monthly or yearly plans",
  },
  {
    icon: Link2,
    text: "HTTP 308 redirects with analytics and QR tracking",
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
  children: React.ReactNode;
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

function PlanCard({ plan, cycle }: { plan: PlanDefinition; cycle: BillingCycle }) {
  const price = formatPrice(plan, cycle);
  const period = cycle === "monthly" ? "month" : "year";

  return (
    <article
      className={cn(
        "flex rounded-md border bg-card p-6 shadow-sm",
        plan.highlighted && "border-emerald-400 bg-emerald-500/5",
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
          {plan.highlighted ? (
            <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              Popular
            </span>
          ) : null}
        </div>
        <div className="mt-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-semibold">{price}</span>
            <span className="text-sm text-muted-foreground">/{period}</span>
          </div>
          {cycle === "yearly" && getYearlySavings(plan) > 0 ? (
            <p className="mt-2 text-sm font-medium text-emerald-400">
              Save ${getYearlySavings(plan)} compared with monthly
            </p>
          ) : null}
        </div>
        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/register"
          className={cn(
            "mt-7 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition",
            plan.highlighted
              ? "border-emerald-400 bg-emerald-400 text-[#07100c] hover:bg-emerald-300"
              : "bg-background hover:bg-muted",
          )}
        >
          {plan.cta}
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
          <p className="text-sm font-semibold uppercase text-emerald-400">
            Feature Comparison
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Compare the full plan limits
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
            Every plan uses the same core redirect, analytics, QR, and Link Page
            engine. Upgrades increase volume, retention, and automation access.
          </p>
        </div>
        <div className="overflow-x-auto rounded-md border bg-background">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted/70 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Free</th>
                <th className="px-4 py-3 font-medium">Pro</th>
                <th className="px-4 py-3 font-medium">Business</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr key={row.feature} className="border-t">
                  <th className="px-4 py-3 font-medium">{row.feature}</th>
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

function FaqSection() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-4xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase text-emerald-400">FAQ</p>
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
    <section className="py-18 sm:py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4 text-emerald-400" />
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
    <section className="border-y bg-muted/40 py-6">
      <Container className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
        {trustItems.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <Icon className="size-5 text-emerald-400" />
            <span>{text}</span>
          </div>
        ))}
      </Container>
    </section>
  );
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero cycle={cycle} onCycleChange={setCycle} />
      <Container className="grid gap-4 pb-16 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} cycle={cycle} />
        ))}
      </Container>
      <TrustBar />
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
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-[#07100c] transition hover:bg-emerald-300"
          >
            Get Started Free
            <ArrowRight className="size-4" />
          </Link>
        </Container>
      </section>
    </main>
  );
}
