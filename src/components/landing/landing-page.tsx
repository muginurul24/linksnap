"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  Copy,
  Globe2,
  Layers3,
  Link2,
  Megaphone,
  QrCode,
  Sparkles,
  Star,
  Timer,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  metric: string;
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
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

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    description: "For creators and small tests.",
    features: [
      "25 short links",
      "3 Link Pages",
      "2 Smart Rules per link",
      "10 QR codes",
      "30-day analytics",
    ],
  },
  {
    name: "Pro",
    price: "$8",
    description: "For active marketers.",
    highlighted: true,
    features: [
      "500 short links",
      "50 Link Pages",
      "10 campaign groups",
      "UTM auto-builder",
      "A/B split testing",
      "API access",
    ],
  },
  {
    name: "Business",
    price: "$19",
    description: "For teams and high-volume launches.",
    features: [
      "Unlimited short links",
      "Unlimited Link Pages",
      "500 QR codes",
      "Webhook callbacks",
      "API at 5000 req/hr",
      "Priority support",
    ],
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

const stats = [
  ["308", "Permanent redirects"],
  ["<50ms", "Redirect target"],
  ["365d", "Analytics retention"],
  ["5K/hr", "Business API limit"],
] as const;

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
      <div className="absolute inset-0">
        <Image
          src="/landing-preview"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#080b0e_0%,rgba(8,11,14,0.9)_35%,rgba(8,11,14,0.55)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
      </div>
      <Container className="relative flex min-h-[82svh] flex-col justify-center py-24 sm:py-28">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="max-w-3xl"
        >
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
          </div>
        </motion.div>
        <div className="mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([value, label]) => (
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

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={item}
      className="rounded-md border bg-card p-6 shadow-sm transition hover:border-emerald-400/50"
    >
      <div className="flex size-11 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {feature.description}
      </p>
    </motion.div>
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
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

function DemoGenerator() {
  const [url, setUrl] = useState("https://myshop.id/ramadhan-sale?utm_source=instagram");
  const [shortLink, setShortLink] = useState("https://linksnap.id/myshop-k7p3");
  const [error, setError] = useState<string | null>(null);

  const destinationHost = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "destination";
    }
  }, [url]);

  function submitDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateDemoUrl(url);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setShortLink(`https://linksnap.id/${generateDemoSlug(url)}`);
  }

  async function copyShortLink() {
    await navigator.clipboard.writeText(shortLink);
    toast.success("Demo link copied.");
  }

  return (
    <section id="demo" className="border-y bg-muted/40 py-20 sm:py-24">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-400">
              Demo Generator
            </p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Generate a short link preview before signing up
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Paste a public URL and LinkSnap creates a live browser-side short
              link preview with the same slug style used in the dashboard.
            </p>
          </div>

          <div className="rounded-md border bg-background p-5 shadow-sm sm:p-6">
            <form className="space-y-4" onSubmit={submitDemo}>
              <label className="block text-sm font-medium" htmlFor="demo-url">
                Destination URL
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="demo-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/campaign"
                  className="h-11"
                  aria-invalid={Boolean(error)}
                />
                <Button type="submit" className="h-11 px-4">
                  Generate
                  <Zap className="size-4" />
                </Button>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>

            <div className="mt-6 rounded-md border bg-muted/50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Short link
                  </p>
                  <p className="mt-1 break-all font-mono text-base text-foreground">
                    {shortLink}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9"
                  onClick={copyShortLink}
                >
                  <Copy className="size-4" />
                  Copy
                </Button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Destination", destinationHost],
                  ["Rule", "HTTP 308"],
                  ["Status", "Preview"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border bg-background p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 truncate text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Preview only. Create an account to publish real redirects, QR
                codes, analytics, and Link Pages.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PricingCard({ plan }: { plan: Plan }) {
  return (
    <motion.div
      variants={item}
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
        <span className="text-4xl font-semibold">{plan.price}</span>
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
        Get Started Free
        <ArrowRight className="size-4" />
      </Link>
    </motion.div>
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
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="grid gap-4 lg:grid-cols-3"
        >
          {plans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </motion.div>
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

function Footer() {
  return (
    <footer className="border-t bg-background py-10">
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <Zap className="size-4" />
          </span>
          LinkSnap
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
          <Link href="#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="#demo" className="hover:text-foreground">
            Demo
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
        </nav>
      </Container>
    </footer>
  );
}

function validateDemoUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return "Use an http or https URL.";
    }

    if (isInternalHostname(hostname)) {
      return "Use a public destination URL.";
    }

    return null;
  } catch {
    return "Enter a valid public URL.";
  }
}

function isInternalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.match(/^172\.(1[6-9]|2\d|3[0-1])\./) !== null
  );
}

function generateDemoSlug(value: string): string {
  const hostname = new URL(value).hostname
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[^a-z0-9-]/gi, "")
    .toLowerCase()
    .slice(0, 10);
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes)
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 5);

  return `${hostname || "snap"}-${suffix}`;
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Hero />
      <Features />
      <DemoGenerator />
      <Pricing />
      <Testimonials />
      <FinalCta />
      <Footer />
    </main>
  );
}
