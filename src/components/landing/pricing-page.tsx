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
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";

type Plan = {
  name: "Free" | "Pro" | "Business";
  description: string;
  monthly: number;
  yearly: number;
  yearlyLabel?: string;
  cta: string;
  highlighted?: boolean;
  features: string[];
};

type ComparisonRow = {
  feature: string;
  free: string;
  pro: string;
  business: string;
};

type Faq = {
  question: string;
  answer: string;
};

const plans: Plan[] = [
  {
    name: "Free",
    description: "For validating your first smart links.",
    monthly: 0,
    yearly: 0,
    cta: "Get Started Free",
    features: [
      "25 short links",
      "3 Link Pages",
      "2 Smart Rules per link",
      "10 QR codes",
      "30-day analytics retention",
    ],
  },
  {
    name: "Pro",
    description: "For active marketers and growing stores.",
    monthly: 8,
    yearly: 75,
    yearlyLabel: "Save $21",
    cta: "Start Pro",
    highlighted: true,
    features: [
      "500 short links",
      "50 Link Pages",
      "10 campaign groups",
      "UTM auto-builder",
      "A/B split testing",
      "API access at 500 req/hr",
    ],
  },
  {
    name: "Business",
    description: "For high-volume campaigns and teams.",
    monthly: 19,
    yearly: 180,
    yearlyLabel: "Save $48",
    cta: "Start Business",
    features: [
      "Unlimited short links",
      "Unlimited Link Pages",
      "Unlimited campaigns",
      "500 QR codes",
      "Webhook callbacks",
      "API access at 5000 req/hr",
      "Priority support",
    ],
  },
];

const comparisonRows: ComparisonRow[] = [
  {
    feature: "Short links",
    free: "25",
    pro: "500",
    business: "Unlimited",
  },
  {
    feature: "Link Pages",
    free: "3",
    pro: "50",
    business: "Unlimited",
  },
  {
    feature: "Smart Rules per link",
    free: "2",
    pro: "5",
    business: "Unlimited",
  },
  {
    feature: "QR codes",
    free: "10",
    pro: "100",
    business: "500",
  },
  {
    feature: "Campaign groups",
    free: "1",
    pro: "10",
    business: "Unlimited",
  },
  {
    feature: "Analytics retention",
    free: "30 days",
    pro: "180 days",
    business: "365 days",
  },
  {
    feature: "A/B split testing",
    free: "Not included",
    pro: "3 variants",
    business: "Unlimited",
  },
  {
    feature: "API rate limit",
    free: "Not included",
    pro: "500 req/hr",
    business: "5000 req/hr",
  },
  {
    feature: "Webhook callbacks",
    free: "Not included",
    pro: "Not included",
    business: "Included",
  },
];

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

function formatPrice(plan: Plan, cycle: BillingCycle): string {
  const amount = cycle === "monthly" ? plan.monthly : plan.yearly;
  return amount === 0 ? "$0" : `$${amount}`;
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

function PlanCard({ plan, cycle }: { plan: Plan; cycle: BillingCycle }) {
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
          {cycle === "yearly" && plan.yearlyLabel ? (
            <p className="mt-2 text-sm font-medium text-emerald-400">
              {plan.yearlyLabel} compared with monthly
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
              {comparisonRows.map((row) => (
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
    () => Math.max(...plans.map((plan) => plan.monthly * 12 - plan.yearly)),
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
        {plans.map((plan) => (
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
