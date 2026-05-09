import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Globe2,
  Layers3,
  Link2,
  Megaphone,
  QrCode,
  Sparkles,
  Star,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { DemoGenerator } from "@/components/landing/demo-generator";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import {
  PLANS,
  formatUsdPrice,
  type PlanDefinition,
} from "@/lib/plans/definitions";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  metric: string;
};

const features: Feature[] = [
  {
    icon: Globe2,
    title: "Link Pages",
    description:
      "Add a branded preview, CTA, countdown, QR code, and social proof before visitors continue.",
  },
  {
    icon: Layers3,
    title: "Smart Redirect Rules",
    description:
      "Route one short link by geography, device, campaign window, or fallback destination.",
  },
  {
    icon: Megaphone,
    title: "Campaign Workbench",
    description:
      "Group links, apply UTM templates, and compare every channel from one operational view.",
  },
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description:
      "Create trackable PNG and SVG QR codes whose destination can change after printing.",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description:
      "Track countries, cities, referrers, browsers, devices, clicks, and unique visitors.",
  },
  {
    icon: Timer,
    title: "Link Scheduler",
    description:
      "Prepare limited-time links that activate and expire automatically for launch windows.",
  },
];

const testimonials: Testimonial[] = [
  {
    quote:
      "We replaced plain marketplace URLs with Link Pages and finally saw which WhatsApp broadcasts converted.",
    name: "Nadia Putri",
    role: "DTC operator, Bandung",
    metric: "+31% checkout visits",
  },
  {
    quote:
      "The same short link routes mobile traffic to the app and desktop traffic to the web campaign. It removed a lot of manual cleanup.",
    name: "Reza Mahendra",
    role: "Growth lead, Jakarta",
    metric: "18 campaigns managed",
  },
  {
    quote:
      "QR codes, UTM rules, and click analytics in one place made offline events measurable for the first time.",
    name: "Intan Wibowo",
    role: "Event marketer, Surabaya",
    metric: "12.8K QR scans",
  },
];

export const LANDING_HERO_STATS = [
  ["4", "Smart rule types"],
  ["120/min", "Business API limit"],
  ["365d", "Analytics retention"],
  ["500", "Business QR codes"],
] as const;

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

function SectionHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase text-emerald-400">{label}</p>
      <h2 className="mt-3 text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b bg-[#080b0e]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#080b0e_0%,#101820_52%,#082018_100%)]" />
      <Container className="relative flex min-h-[78svh] flex-col justify-center py-24 sm:py-28">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur">
            <Sparkles className="size-4 text-emerald-300" />
            Link intelligence for conversion-focused campaigns
          </p>
          <h1 className="mt-6 text-5xl font-semibold text-white sm:text-6xl lg:text-7xl">
            LinkSnap
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
            Shorten URLs, add branded Link Pages, route visitors by context, and
            measure every click without stitching together five tools.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-[#080b0e] transition hover:bg-emerald-100"
            >
              Get Started Free
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="#demo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Link2 className="size-4" />
              Try Demo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Pricing
            </Link>
          </div>
        </div>
        <div className="mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {LANDING_HERO_STATS.map(([value, label]) => (
            <div key={label} className="border-l border-white/15 pl-4">
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-sm text-slate-300">{label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function ProductPreview() {
  return (
    <section className="border-b bg-background py-10">
      <Container>
        <Image
          src="/landing-preview.png"
          alt="LinkSnap campaign dashboard preview"
          width={1200}
          height={630}
          sizes="(min-width: 1024px) 1024px, 100vw"
          className="mx-auto h-auto w-full max-w-5xl rounded-md border shadow-sm"
        />
      </Container>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <div className="rounded-md border bg-card p-6 shadow-sm transition hover:border-emerald-400/50">
      <div className="flex size-11 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {feature.description}
      </p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          label="Features"
          title="Six tools marketers usually buy separately"
          description="LinkSnap keeps short links, micro landing pages, campaign tracking, QR workflows, and redirect logic in one focused product."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function PricingCard({ plan }: { plan: PlanDefinition }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-6 shadow-sm",
        plan.highlighted && "border-emerald-400 bg-emerald-500/5",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">{plan.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
        </div>
        {plan.highlighted ? (
          <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            Popular
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-semibold">
          {formatUsdPrice(plan.monthlyUsd)}
        </span>
        <span className="text-sm text-muted-foreground">/month</span>
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
  );
}

function Pricing() {
  return (
    <section id="pricing" className="py-20 sm:py-24">
      <Container>
        <SectionHeading
          label="Pricing"
          title="Start free, upgrade when campaigns need more room"
          description="The free tier includes real short links, Link Pages, Smart Rules, QR codes, and analytics retention for MVP launches."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="border-y bg-muted/40 py-20 sm:py-24">
      <Container>
        <SectionHeading
          label="Testimonials"
          title="Built for teams that need links to carry revenue context"
          description="Marketers, store owners, and event teams use LinkSnap to keep campaigns measurable from the first click."
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="rounded-md border bg-card p-6">
              <div className="flex gap-1 text-amber-400" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="size-4 fill-current" />
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {testimonial.quote}
              </p>
              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
                <p className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  {testimonial.metric}
                </p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-foreground py-16 text-background">
      <Container className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Launch smarter short links today.
          </h2>
          <p className="mt-3 text-sm leading-6 text-background/70 sm:text-base">
            Build branded redirects, campaign groups, QR codes, and analytics in
            the same workflow your team already uses.
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
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Features />
      <ProductPreview />
      <DemoGenerator />
      <Pricing />
      <Testimonials />
      <FinalCta />
      <MarketingFooter />
    </main>
  );
}
