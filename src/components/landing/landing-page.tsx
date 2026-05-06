"use client";

import { useRef } from "react";
import Link from "next/link";
import {
    motion,
    useInView,
} from "framer-motion";
import {
    Zap,
    Globe,
    QrCode,
    Megaphone,
    BarChart3,
    Timer,
    ArrowRight,
    Check,
    Star,
    Sparkles,
    Shield,
    MousePointerClick,
    Copy,
    Layers,
    Link2,
    type LucideIcon,
} from "lucide-react";

/* ── Stagger helpers ── */
const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.6, ease: "easeOut" as const },
    },
};

/* ── Floating animated blobs ── */
function AnimatedBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -80, 40, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute -top-20 left-1/4 size-125 rounded-full bg-linear-to-br from-primary/20 via-violet-500/10 to-transparent blur-3xl"
            />
            <motion.div
                animate={{
                    x: [0, -120, 80, 0],
                    y: [0, 60, -100, 0],
                    scale: [1, 0.8, 1.1, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute bottom-0 right-1/4 size-150 rounded-full bg-linear-to-tl from-cyan-500/15 via-primary/10 to-transparent blur-3xl"
            />
            <motion.div
                animate={{ x: [0, 80, -60, 0], y: [0, -120, 80, 0] }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute left-1/3 top-1/2 size-100 rounded-full bg-linear-to-r from-amber-500/10 via-rose-500/10 to-transparent blur-3xl"
            />
        </div>
    );
}

/* ── Section wrapper ── */
function Section({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`relative py-20 md:py-28 ${className}`}>
            {children}
        </section>
    );
}

function Container({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${className}`}>
            {children}
        </div>
    );
}

/* ── Section Headings ── */
function SectionHeading({
    tag,
    title,
    desc,
}: {
    tag?: string;
    title: string;
    desc?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mx-auto mb-16 max-w-2xl text-center"
        >
            {tag && (
                <span className="mb-3 inline-block text-sm font-semibold tracking-wider text-primary uppercase">
                    {tag}
                </span>
            )}
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {title}
            </h2>
            {desc && (
                <p className="mt-4 text-lg text-muted-foreground">{desc}</p>
            )}
        </motion.div>
    );
}

/* ── Floating link preview ── */
function FloatingLinkPreview() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" as const }}
            className="relative"
        >
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="rounded-2xl border bg-card/80 p-6 shadow-2xl shadow-primary/10 backdrop-blur-xl"
            >
                {/* Browser chrome */}
                <div className="mb-4 flex items-center gap-2">
                    <div className="size-3 rounded-full bg-red-500/80" />
                    <div className="size-3 rounded-full bg-amber-500/80" />
                    <div className="size-3 rounded-full bg-emerald-500/80" />
                    <div className="ml-2 flex-1 rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground font-mono">
                        linksnap.id/promo-ramadhan
                    </div>
                </div>
                {/* Link Page preview */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-linear-to-br from-primary to-violet-500 flex items-center justify-center">
                            <Zap className="size-5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">
                                MyShop Official
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Ramadhan Mega Sale 2026
                            </p>
                        </div>
                    </div>
                    <div className="rounded-xl border bg-muted/50 p-4">
                        <p className="text-sm font-medium">
                            🔥 Up to 70% Off — Limited Time!
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 rounded-lg bg-linear-to-r from-primary to-violet-500 px-4 py-2.5 text-center text-sm font-semibold text-white">
                                Shop Now
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MousePointerClick className="size-3" /> 8,142
                                clicks
                            </div>
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                            <Timer className="size-3 text-amber-500" />
                            <span className="font-mono tabular-nums text-amber-500">
                                02:35:12
                            </span>
                            <span className="text-muted-foreground">
                                remaining
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
            {/* Floating dots */}
            {[
                { top: "-12px", left: "10%", delay: 0 },
                { top: "50%", right: "-20px", delay: 1.5 },
                { bottom: "-20px", left: "60%", delay: 3 },
            ].map((p, i) => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0], opacity: [1, 0.5, 1] }}
                    transition={{
                        duration: 3,
                        delay: p.delay,
                        repeat: Infinity,
                    }}
                    className="absolute size-2 rounded-full bg-primary/60"
                    style={p}
                />
            ))}
        </motion.div>
    );
}

/* ── Feature Card ── */
function FeatureCard({
    icon: Icon,
    title,
    desc,
}: {
    icon: LucideIcon;
    title: string;
    desc: string;
}) {
    return (
        <motion.div
            variants={itemVariants}
            className="group relative rounded-2xl border bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-card"
        >
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-violet-500/20 ring-1 ring-primary/10 group-hover:from-primary/30 group-hover:to-violet-500/30 transition-all">
                <Icon className="size-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
                {desc}
            </p>
        </motion.div>
    );
}

/* ── Stat counter ── */
function StatCard({
    value,
    label,
    icon: Icon,
}: {
    value: string;
    label: string;
    icon: LucideIcon;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center"
        >
            <Icon className="mb-3 size-6 text-primary/70" />
            <span className="text-3xl font-bold tabular-nums tracking-tight">
                {value}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">{label}</span>
        </motion.div>
    );
}

/* ── Step card ── */
function StepCard({
    step,
    title,
    desc,
    icon: Icon,
}: {
    step: string;
    title: string;
    desc: string;
    icon: LucideIcon;
}) {
    return (
        <motion.div
            variants={itemVariants}
            className="relative flex flex-col items-center text-center"
        >
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/25">
                <Icon className="size-6" />
            </div>
            <span className="mb-2 text-xs font-bold tracking-widest text-primary uppercase">
                {step}
            </span>
            <h3 className="mb-1 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
        </motion.div>
    );
}

/* ── Pricing card ── */
function PricingCard({
    name,
    price,
    period,
    desc,
    features,
    highlighted,
    cta,
}: {
    name: string;
    price: string;
    period: string;
    desc: string;
    features: string[];
    highlighted?: boolean;
    cta: string;
}) {
    return (
        <motion.div
            variants={itemVariants}
            className={`relative rounded-2xl border p-8 backdrop-blur-sm ${highlighted ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 ring-1 ring-primary" : "bg-card/60"}`}
        >
            {highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-r from-primary to-violet-500 px-4 py-1 text-xs font-bold text-white shadow-lg">
                    Most Popular
                </div>
            )}
            <h3 className="text-xl font-bold">{name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                    {price}
                </span>
                <span className="text-muted-foreground">/{period}</span>
            </div>
            <ul className="mt-6 space-y-3">
                {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 text-emerald-500 shrink-0" />
                        {f}
                    </li>
                ))}
            </ul>
            <Link
                href="/register"
                className={`mt-8 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25" : "border bg-card text-foreground hover:bg-muted"}`}
            >
                {cta} <ArrowRight className="ml-2 size-4" />
            </Link>
        </motion.div>
    );
}

/* ═══════════════════════════════════ MAIN PAGE ═══════════════════════════════════ */
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <AnimatedBackground />

            {/* ─── NAV ─── */}
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl"
            >
                <Container className="flex h-16 items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-bold text-xl tracking-tight"
                    >
                        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Zap className="size-4" />
                        </div>
                        LinkSnap
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/login"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/register"
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                        >
                            Get Started Free
                        </Link>
                    </div>
                </Container>
            </motion.nav>

            {/* ─── HERO ─── */}
            <Section>
                <Container>
                    <div className="grid items-center gap-12 lg:grid-cols-2">
                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1, duration: 0.7 }}
                                className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm"
                            >
                                <Sparkles className="size-4" /> The smartest way
                                to share links
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.7 }}
                                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
                            >
                                Every link becomes a{" "}
                                <span className="bg-linear-to-r from-primary via-violet-500 to-cyan-400 bg-clip-text text-transparent">
                                    conversion engine
                                </span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.7 }}
                                className="mt-6 text-lg leading-relaxed text-muted-foreground"
                            >
                                Transform ordinary URLs into branded micro
                                landing pages, smart redirects, and campaign
                                machines — all from one dashboard. Built for
                                marketers who demand more than just a short
                                link.
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.7 }}
                                className="mt-8 flex flex-col gap-4 sm:flex-row"
                            >
                                <Link
                                    href="/register"
                                    className="group inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                                >
                                    Start Building Free{" "}
                                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                                </Link>
                                <Link
                                    href="#demo"
                                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 text-base font-semibold transition-all hover:bg-muted"
                                >
                                    <Copy className="size-4" /> Try Demo
                                </Link>
                            </motion.div>
                        </div>
                        <div className="flex justify-center lg:justify-end">
                            <FloatingLinkPreview />
                        </div>
                    </div>
                </Container>
            </Section>

            {/* ─── STATS ─── */}
            <Section className="border-y bg-muted/30">
                <Container>
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid grid-cols-2 gap-8 md:grid-cols-4"
                    >
                        <StatCard
                            value="10M+"
                            label="Links Shortened"
                            icon={Link2}
                        />
                        <StatCard
                            value="99.9%"
                            label="Uptime SLA"
                            icon={Shield}
                        />
                        <StatCard
                            value="<50ms"
                            label="Redirect Speed"
                            icon={Zap}
                        />
                        <StatCard
                            value="50K+"
                            label="Happy Users"
                            icon={Star}
                        />
                    </motion.div>
                </Container>
            </Section>

            {/* ─── FEATURES ─── */}
            <Section>
                <Container>
                    <SectionHeading
                        tag="Features"
                        title="More than just short links"
                        desc="LinkSnap combines URL shortening, branded landing pages, smart redirect rules, and campaign analytics into one premium platform."
                    />
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        <FeatureCard
                            icon={Globe}
                            title="Link Pages"
                            desc="Branded micro landing pages per link — logo, CTA button, countdown timer, social proof. Turn every share into a conversion moment."
                        />
                        <FeatureCard
                            icon={Layers}
                            title="Smart Rules"
                            desc="Geo, device, time, and language-based redirects. One link, multiple destinations — served to the right person at the right moment."
                        />
                        <FeatureCard
                            icon={Megaphone}
                            title="Campaign Workbench"
                            desc="Group links into campaigns with auto UTM, unified analytics, and A/B split testing. Know exactly what's working."
                        />
                        <FeatureCard
                            icon={QrCode}
                            title="Dynamic QR Codes"
                            desc="Editable destination URLs even after QR is printed. PNG + SVG exports. Track scans alongside clicks."
                        />
                        <FeatureCard
                            icon={BarChart3}
                            title="Deep Analytics"
                            desc="Geo distribution, device breakdown, referrer tracking, and click trends. Retention up to 365 days on Premium."
                        />
                        <FeatureCard
                            icon={Timer}
                            title="Link Scheduler"
                            desc="Schedule links to activate and deactivate automatically. Perfect for flash sales and limited-time offers."
                        />
                    </motion.div>
                </Container>
            </Section>

            {/* ─── HOW IT WORKS ─── */}
            <Section className="bg-muted/30 border-y">
                <Container>
                    <SectionHeading
                        tag="How It Works"
                        title="Three steps to smarter links"
                        desc="Start sharing in under 60 seconds. No credit card required."
                    />
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid gap-8 sm:grid-cols-3"
                    >
                        <StepCard
                            step="Step 1"
                            title="Paste Your URL"
                            desc="Drop any long URL into LinkSnap. We generate a clean, branded short link instantly."
                            icon={Copy}
                        />
                        <StepCard
                            step="Step 2"
                            title="Customize & Enhance"
                            desc="Add a Link Page with your brand, set Smart Rules, or attach it to a campaign with auto UTM."
                            icon={Layers}
                        />
                        <StepCard
                            step="Step 3"
                            title="Share & Analyze"
                            desc="Share everywhere. Watch real-time analytics roll in — clicks, countries, devices, conversions."
                            icon={BarChart3}
                        />
                    </motion.div>
                </Container>
            </Section>

            {/* ─── PRICING ─── */}
            <Section>
                <Container>
                    <SectionHeading
                        tag="Pricing"
                        title="Plans that scale with you"
                        desc="Start free. Upgrade when you need more power. No hidden fees."
                    />
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={containerVariants}
                        className="grid gap-6 lg:grid-cols-3"
                    >
                        <PricingCard
                            name="Free"
                            price="$0"
                            period="forever"
                            desc="Perfect for getting started."
                            features={[
                                "25 short links",
                                "3 Link Pages",
                                "2 Smart Rules",
                                "10 QR codes",
                                "30-day analytics",
                            ]}
                            cta="Get Started"
                        />
                        <PricingCard
                            name="Pro"
                            price="$8"
                            period="month"
                            desc="For power marketers."
                            features={[
                                "500 short links",
                                "50 Link Pages",
                                "5 Smart Rules",
                                "100 QR codes",
                                "10 campaigns",
                                "UTM auto-builder",
                                "A/B split testing",
                                "API access",
                            ]}
                            highlighted
                            cta="Upgrade to Pro"
                        />
                        <PricingCard
                            name="Business"
                            price="$19"
                            period="month"
                            desc="For teams at scale."
                            features={[
                                "Unlimited links",
                                "Unlimited Link Pages",
                                "Unlimited campaigns",
                                "Webhook callbacks",
                                "API (5000 req/hr)",
                                "Export PDF + API",
                                "Priority support",
                            ]}
                            cta="Upgrade to Business"
                        />
                    </motion.div>
                </Container>
            </Section>

            {/* ─── CTA ─── */}
            <Section>
                <Container>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-violet-600 to-cyan-500 p-10 text-center shadow-2xl shadow-primary/20 md:p-16"
                    >
                        <motion.div
                            animate={{ rotate: [0, 360] }}
                            transition={{
                                duration: 30,
                                repeat: Infinity,
                                ease: "linear",
                            }}
                            className="absolute -right-20 -top-20 size-80 rounded-full bg-white/5 blur-2xl"
                        />
                        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                            Ready to transform your links?
                        </h2>
                        <p className="mt-4 text-lg text-white/80">
                            Join thousands of marketers who turned ordinary
                            links into conversion machines.
                        </p>
                        <Link
                            href="/register"
                            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 px-8 py-3.5 text-base font-bold text-primary shadow-lg shadow-black/10 transition-all hover:scale-105"
                        >
                            Get Started Free <ArrowRight className="size-4" />
                        </Link>
                        <p className="mt-4 text-sm text-white/60">
                            No credit card required · Free plan forever
                        </p>
                    </motion.div>
                </Container>
            </Section>

            {/* ─── FOOTER ─── */}
            <footer className="border-t bg-muted/30">
                <Container className="py-12">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <Link
                                href="/"
                                className="flex items-center gap-2 font-bold text-lg"
                            >
                                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Zap className="size-4" />
                                </div>
                                LinkSnap
                            </Link>
                            <p className="mt-3 text-sm text-muted-foreground">
                                Smart links that convert.
                            </p>
                        </div>
                        {[
                            {
                                title: "Product",
                                links: [
                                    "Features",
                                    "Pricing",
                                    "Blog",
                                    "API Docs",
                                ],
                            },
                            {
                                title: "Company",
                                links: [
                                    "About",
                                    "Privacy Policy",
                                    "Terms of Service",
                                    "Contact",
                                ],
                            },
                            {
                                title: "Resources",
                                links: [
                                    "Help Center",
                                    "Tutorials",
                                    "Status",
                                    "Changelog",
                                ],
                            },
                        ].map((col) => (
                            <div key={col.title}>
                                <h4 className="mb-3 font-semibold text-sm">
                                    {col.title}
                                </h4>
                                <ul className="space-y-2">
                                    {col.links.map((l) => (
                                        <li key={l}>
                                            <Link
                                                href="#"
                                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {l}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <div className="mt-12 border-t pt-6 text-center text-sm text-muted-foreground">
                        © {new Date().getFullYear()} LinkSnap. Built with ❤️ for
                        marketers who demand more.
                    </div>
                </Container>
            </footer>
        </div>
    );
}
