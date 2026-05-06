# PRD: LinkSnap

## Smart Short Links & Micro Landing Pages Platform

---

## Executive Summary

LinkSnap adalah platform URL shortener next-gen yang menggabungkan **Smart Redirect Rules**, **Link Pages** (micro landing page per link), dan **Campaign Workbench** dalam satu produk. Dibangun dengan **Next.js 16 + App Router + Bun**, LinkSnap menargetkan celah pasar yang belum tersentuh oleh TinyURL, Bitly, maupun kompetitor lain: memberikan marketer dan business owner kemampuan untuk mengubah setiap short link menjadi konversi engine — bukan sekedar redirect.

**Differentiator utama:** Setiap short link di LinkSnap bisa memiliki Link Page opsional — halaman preview branded dengan CTA button, countdown timer, social proof, dan QR code — sebelum pengunjung diarahkan ke URL tujuan. Tidak ada kompetitor yang menawarkan integrasi short URL + micro landing page per-link dalam satu platform.

---

## Competitive Analysis

### Gap Analysis — Mengapa LinkSnap?

| Feature               | TinyURL | Bitly           | Dub.co | Linkly    | Revolink  | **LinkSnap**     |
| --------------------- | ------- | --------------- | ------ | --------- | --------- | ---------------- |
| Short URL             | ✅      | ✅              | ✅     | ✅        | ✅        | ✅               |
| QR Code               | ❌      | ✅ (paid)       | ✅     | ✅        | ✅        | ✅               |
| Basic Analytics       | ❌      | ✅ (paid)       | ✅     | ✅        | ✅        | ✅               |
| Conditional Redirect  | ❌      | Enterprise only | ❌     | ✅ (paid) | ✅ (paid) | ✅ **Free tier** |
| Link Pages (per-link) | ❌      | ❌              | ❌     | ❌        | ❌        | ✅ **Unique**    |
| Campaign Workbench    | ❌      | ✅ (paid)       | ❌     | ❌        | ❌        | ✅               |
| UTM Auto-Builder      | ❌      | ❌              | ❌     | ✅        | ❌        | ✅               |
| A/B Split Testing     | ❌      | ❌              | ❌     | ✅ (paid) | ❌        | ✅               |
| Link Scheduler        | ❌      | ❌              | ❌     | ❌        | ❌        | ✅ **Unique**    |
| Midtrans Payment      | ❌      | ❌              | ❌     | ❌        | ❌        | ✅ **ID focus**  |
| Open Source core      | ❌      | ❌              | ✅     | ❌        | ❌        | ✅               |

### Posisi di Pasar

LinkSnap duduk di tengah antara:

- **TinyURL** (terlalu simpel, zero analytics) dan
- **Bitly** (enterprise, mahal, overkill untuk UMKM)

Dengan value prop unik: **"Setiap link bukan cuma redirect, tapi conversion tool."**

---

## Unique Value Propositions

### 1. Link Pages — Micro Landing Page Per Link 🚀

Setiap short link bisa memiliki halaman preview branded OPSIONAL dengan:

- **Brand header** — Logo, title, description custom
- **OG Image preview** — Auto-generated atau custom upload
- **CTA Button** — "Continue to [Brand]", custom text & color
- **Countdown Timer** — Untuk flash sale / limited time offers ("Offer ends in 02:35:12")
- **Social Proof** — "1,234 people clicked this link"
- **QR Code display** — Untuk mobile sharing cepat
- **Deep link buttons** — "Open in App" jika terdeteksi mobile
- **Analytics snapshot** — Ringkasan performa link yang terlihat oleh pemilik

Use case nyata:

> Seorang dropshipper sharing link produk Shopee. Dengan LinkSnap, alih-alih langsung redirect ke Shopee, pengunjung lihat micro landing page dengan brand dia sendiri, countdown "promo berakhir dalam 2 jam", dan CTA "Beli Sekarang". Conversion rate naik drastis.

### 2. Smart Redirect Rules — Conditional Routing Gratis

Satu short link, banyak destinasi berdasarkan kondisi:

- **Geo Rules** — 🇮🇩 redirect ke Tokopedia, 🇲🇾 redirect ke Lazada, 🌏 redirect ke Shopee
- **Device Rules** — 📱 redirect ke Play Store/App Store, 💻 redirect ke web
- **Time Rules** — ☀️ morning promo vs 🌙 evening promo
- **Language Rules** — 🇬🇧 English page vs 🇮🇩 Indonesian page
- **Fallback Chain** — Jika primary URL unreachable → next URL → default

Tidak seperti Bitly yang mengunci fitur ini di enterprise plan, LinkSnap menawarkan Smart Rules di **Free tier** (max 2 rules per link).

### 3. Campaign Workbench — Manajemen Campaign Terintegrasi

Kelola links dalam campaign untuk analytics terpadu:

- **Campaign Groups** — Kumpulkan links per campaign (e.g., "Ramadhan Sale 2026")
- **UTM Auto-Rules** — Set UTM template per campaign, auto-apply ke semua link baru
- **Unified Analytics** — Lihat performa semua link dalam satu campaign sekaligus
- **A/B Split Testing** — Satu short link, traffic di-split ke multiple destinations, ukur mana yang lebih baik
- **Campaign Scheduler** — Schedule links aktif/nonaktif otomatis (e.g., flash sale 12:00-14:00)

### 4. Developer-Friendly

- **Public API** dengan rate limiting fair per plan
- **Webhook callback** — Real-time notifikasi saat link diklik (integrasi ke Slack, Discord, custom webhook)
- **Open source core** — Backend terbuka, frontend proprietary. Host sendiri jika mau.

---

## Scope

### ✅ In Scope (MVP — 12 minggu)

**Core Platform:**

- Short link generation: random slug & custom slug
- Redirect endpoint: 301 permanent, p99 <50ms
- QR Code generation per link (downloadable PNG/SVG)
- Link Pages — branded preview per link (CTA, countdown, social proof)
- Smart Redirect Rules — geo & device rules (MVP; time/language di V2)

**User Management:**

- Register, Login (email + Google OAuth), Email verification via Resend
- JWT auth (httpOnly cookies)
- Dashboard: My Links, Link Pages, QR Codes, Analytics, Settings

**Analytics:**

- Click count, geo distribution, referrer, device/browser/OS
- Per-link analytics + per-campaign unified view
- Analytics retention: Free 30 hari, Pro 180 hari, Business 365 hari

**Campaign Workbench:**

- Campaign CRUD — grouping links into campaigns
- UTM auto-template per campaign
- Campaign-level analytics dashboard

**Payment:**

- Plans: Free ($0), Pro ($8/mo or $75/yr), Business ($19/mo or $180/yr)
- Midtrans payment integration
- Webhook handling (payment status update)
- Invoice email via Resend

**Public Site:**

- Landing page (Next.js SSR, SEO optimized)
- Pricing page (monthly/annual toggle)
- Demo link generator (try before register)
- Blog (MDX, minimal 3 artikel untuk SEO launch)

### 🚫 Out of Scope (MVP)

- Custom domain support (V2)
- Password-protected links (V2)
- Team/workspace accounts (V2)
- White-label / reseller (V2)
- Deep linking (iOS/Android app) (V2)
- Affiliate/referral system (later)
- Link-in-bio profile page (bedakan dari Link Pages — ini different product)
- Enterprise SSO (V3)

---

## User Personas

| Persona              | Deskripsi                                     | Pain Point                                           | LinkSnap Solution                           |
| -------------------- | --------------------------------------------- | ---------------------------------------------------- | ------------------------------------------- |
| **Dropshipper Indo** | Jualan via link marketplace, butuh conversion | Link polos ga ada branding, susah tracking           | Link Pages + UTM Auto + Analytics           |
| **Digital Marketer** | Kelola 50+ link per campaign, multi-platform  | Ga ada unified view, ga bisa A/B test                | Campaign Workbench + Split Testing          |
| **UMKM Owner**       | Sharing link promo di WhatsApp/IG             | Pelanggan ga percaya link aneh, ga ada timer urgency | Link Pages dengan countdown + brand logo    |
| **Content Creator**  | Share link affiliate banyak platform          | Butuh conditional redirect per device                | Smart Rules: mobile ke app, desktop ke web  |
| **Developer**        | Integrasi link shortening ke aplikasi sendiri | API mahal, rate limit ketat                          | Public API fair pricing + webhook callbacks |
| **Blog Reader**      | Nyari artikel SEO tentang digital marketing   | —                                                    | Blog MDX, fast load, SEO optimized          |

---

## Subscription Tier Matrix

| Feature                      | Free        | Pro ($8/mo)     | Business ($19/mo) |
| ---------------------------- | ----------- | --------------- | ----------------- |
| Short Links                  | 25          | 500             | Unlimited         |
| Link Pages                   | 3           | 50              | Unlimited         |
| Smart Rules per link         | 2           | 5               | Unlimited         |
| QR Codes                     | 10          | 100             | 500               |
| Custom Slug                  | ❌ (random) | ✅              | ✅                |
| Analytics Retention          | 30 days     | 180 days        | 365 days          |
| Campaign Groups              | 1           | 10              | Unlimited         |
| UTM Auto-Builder             | ❌          | ✅              | ✅                |
| A/B Split Testing            | ❌          | ✅ (3 variants) | ✅ (unlimited)    |
| Link Scheduler               | ❌          | ✅              | ✅                |
| API Access                   | ❌          | ✅ (500 req/hr) | ✅ (5000 req/hr)  |
| Webhook Callbacks            | ❌          | ❌              | ✅                |
| Custom Branding (Link Pages) | ❌          | ✅              | ✅                |
| Export Analytics             | CSV         | CSV + PDF       | CSV + PDF + API   |

---

## API Design

### Response Format

```typescript
// Success
interface ApiSuccess<T> {
    success: true;
    data: T;
    meta?: { page: number; limit: number; total: number };
}

// Error
interface ApiError {
    success: false;
    error: {
        code: ErrorCode;
        message: string;
        details?: unknown;
        requestId: string;
    };
}
```

### Key Endpoints

| Method | Path                          | Auth     | Description                            |
| ------ | ----------------------------- | -------- | -------------------------------------- |
| POST   | `/v1/auth/register`           | No       | Register + kirim OTP                   |
| POST   | `/v1/auth/verify`             | No       | Verifikasi email                       |
| POST   | `/v1/auth/login`              | No       | Login, set JWT cookies                 |
| POST   | `/v1/auth/google`             | No       | Google OAuth                           |
| POST   | `/v1/auth/refresh`            | Refresh  | Rotate token                           |
| POST   | `/v1/auth/logout`             | Access   | Clear session                          |
| POST   | `/v1/links`                   | Access   | Create short link                      |
| GET    | `/v1/links`                   | Access   | List user links                        |
| GET    | `/v1/links/:id`               | Access   | Detail link + analytics                |
| PATCH  | `/v1/links/:id`               | Access   | Update link (slug, destination, rules) |
| DELETE | `/v1/links/:id`               | Access   | Delete link                            |
| GET    | `/v1/links/:id/analytics`     | Access   | Full analytics data                    |
| POST   | `/v1/links/:id/page`          | Access   | Create/update Link Page                |
| GET    | `/v1/links/:id/page`          | No       | View Link Page (public)                |
| PUT    | `/v1/links/:id/rules`         | Access   | Configure Smart Rules                  |
| GET    | `/v1/qr/:slug`                | No       | QR image (PNG/SVG), cached             |
| GET    | `/:slug`                      | No       | Redirect (or Link Page if enabled)     |
| POST   | `/v1/campaigns`               | Access   | Create campaign                        |
| GET    | `/v1/campaigns`               | Access   | List campaigns                         |
| GET    | `/v1/campaigns/:id/analytics` | Access   | Campaign analytics                     |
| POST   | `/v1/campaigns/:id/links`     | Access   | Add links to campaign                  |
| POST   | `/v1/payments/create`         | Access   | Create Midtrans transaction            |
| POST   | `/v1/payments/webhook`        | Midtrans | Webhook handler                        |
| GET    | `/v1/payments/history`        | Access   | Billing history                        |

---

## Data Model (Drizzle ORM + PostgreSQL)

```typescript
// db/schema.ts
import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    real,
    pgEnum,
    uniqueIndex,
    index,
    jsonb,
} from "drizzle-orm/pg-core";

export const planEnum = pgEnum("plan", ["FREE", "PRO", "BUSINESS"]);
export const paymentStatusEnum = pgEnum("payment_status", [
    "PENDING",
    "SETTLEMENT",
    "CANCEL",
    "DENY",
    "EXPIRE",
]);
export const ruleTypeEnum = pgEnum("rule_type", [
    "GEO",
    "DEVICE",
    "TIME",
    "LANGUAGE",
]);

// ─── Users ───
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    googleId: varchar("google_id", { length: 255 }).unique(),
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    emailVerified: timestamp("email_verified"),
    otpCode: varchar("otp_code", { length: 6 }),
    otpExpiresAt: timestamp("otp_expires_at"),
    refreshTokenHash: text("refresh_token_hash"),
    plan: planEnum("plan").default("FREE").notNull(),
    role: varchar("role", { length: 20 }).default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Links ───
export const links = pgTable(
    "links",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        slug: varchar("slug", { length: 50 }).notNull().unique(),
        destinationUrl: text("destination_url").notNull(),
        title: varchar("title", { length: 255 }),
        hasLinkPage: boolean("has_link_page").default(false).notNull(),
        isActive: boolean("is_active").default(true).notNull(),
        scheduledAt: timestamp("scheduled_at"),
        expiresAt: timestamp("expires_at"),
        clickCount: integer("click_count").default(0).notNull(),
        campaignId: uuid("campaign_id").references(() => campaigns.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        slugIdx: uniqueIndex("slug_idx").on(table.slug),
        userIdIdx: index("links_user_id_idx").on(table.userId),
        campaignIdx: index("links_campaign_idx").on(table.campaignId),
    }),
);

// ─── Link Pages ───
export const linkPages = pgTable("link_pages", {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: uuid("link_id")
        .references(() => links.id, { onDelete: "cascade" })
        .notNull()
        .unique(),
    brandName: varchar("brand_name", { length: 100 }).notNull(),
    brandLogo: text("brand_logo"),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    ogImage: text("og_image"),
    ctaText: varchar("cta_text", { length: 50 }).default("Continue").notNull(),
    ctaColor: varchar("cta_color", { length: 7 }).default("#6366f1").notNull(),
    showCountdown: boolean("show_countdown").default(false),
    countdownTarget: timestamp("countdown_target"),
    showSocialProof: boolean("show_social_proof").default(true),
    showQrCode: boolean("show_qr_code").default(true),
    theme: varchar("theme", { length: 20 }).default("auto").notNull(), // auto, dark, light
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Smart Rules ───
export const smartRules = pgTable(
    "smart_rules",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        linkId: uuid("link_id")
            .references(() => links.id, { onDelete: "cascade" })
            .notNull(),
        type: ruleTypeEnum("type").notNull(),
        condition: jsonb("condition").notNull(), // { country: "ID" } or { device: "mobile" }
        destinationUrl: text("destination_url").notNull(),
        priority: integer("priority").default(0).notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
        linkIdIdx: index("rules_link_id_idx").on(table.linkId),
    }),
);

// ─── Click Events ───
export const clickEvents = pgTable(
    "click_events",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        linkId: uuid("link_id")
            .references(() => links.id, { onDelete: "cascade" })
            .notNull(),
        ruleId: uuid("rule_id").references(() => smartRules.id, {
            onDelete: "set null",
        }),
        timestamp: timestamp("timestamp").defaultNow().notNull(),
        ipHash: varchar("ip_hash", { length: 64 }),
        country: varchar("country", { length: 100 }),
        city: varchar("city", { length: 100 }),
        referrer: text("referrer"),
        userAgent: text("user_agent"),
        device: varchar("device", { length: 20 }),
        browser: varchar("browser", { length: 50 }),
        os: varchar("os", { length: 50 }),
    },
    (table) => ({
        linkIdIdx: index("ce_link_id_idx").on(table.linkId),
        tsIdx: index("ce_ts_idx").on(table.timestamp),
    }),
);

// ─── Campaigns ───
export const campaigns = pgTable(
    "campaigns",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .references(() => users.id, { onDelete: "cascade" })
            .notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        slug: varchar("slug", { length: 100 }).notNull(),
        description: text("description"),
        utmSource: varchar("utm_source", { length: 100 }),
        utmMedium: varchar("utm_medium", { length: 100 }),
        utmCampaign: varchar("utm_campaign", { length: 100 }),
        utmTerm: varchar("utm_term", { length: 100 }),
        utmContent: varchar("utm_content", { length: 100 }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull(),
    },
    (table) => ({
        userIdIdx: index("campaigns_user_idx").on(table.userId),
        slugIdx: uniqueIndex("campaigns_slug_idx").on(table.userId, table.slug),
    }),
);

// ─── Split Tests ───
export const splitTests = pgTable("split_tests", {
    id: uuid("id").defaultRandom().primaryKey(),
    linkId: uuid("link_id")
        .references(() => links.id, { onDelete: "cascade" })
        .notNull()
        .unique(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const splitTestVariants = pgTable("split_test_variants", {
    id: uuid("id").defaultRandom().primaryKey(),
    splitTestId: uuid("split_test_id")
        .references(() => splitTests.id, { onDelete: "cascade" })
        .notNull(),
    destinationUrl: text("destination_url").notNull(),
    weight: integer("weight").default(50).notNull(), // percentage
    clickCount: integer("click_count").default(0).notNull(),
});

// ─── Payments ───
export const subscriptions = pgTable("subscriptions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull()
        .unique(),
    plan: planEnum("plan").notNull(),
    status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
    orderId: varchar("order_id", { length: 100 }).notNull().unique(),
    plan: planEnum("plan").notNull(),
    duration: varchar("duration", { length: 10 }).notNull(), // monthly, annual
    grossAmountUsd: real("gross_amount_usd").notNull(),
    grossAmountIdr: integer("gross_amount_idr").notNull(),
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    snapToken: text("snap_token"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── System Settings ───
export const settings = pgTable("settings", {
    key: varchar("key", { length: 100 }).primaryKey(),
    value: text("value").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

---

## Technology Stack

| Technology                       | Purpose                                                                      |
| -------------------------------- | ---------------------------------------------------------------------------- |
| **Next.js 16** (App Router)      | Full-stack framework — SSR landing page, API routes, React Server Components |
| **Bun**                          | Package manager & runtime                                                    |
| **TypeScript**                   | Strict mode, full type safety                                                |
| **Tailwind CSS** + **shadcn/ui** | Styling & component library                                                  |
| **Drizzle ORM**                  | Type-safe database ORM                                                       |
| **PostgreSQL** (Neon.tech)       | Primary database                                                             |
| **Redis** (Upstash)              | Caching, rate limiting, session store                                        |
| **Resend**                       | Transactional email                                                          |
| **Midtrans**                     | Payment gateway                                                              |
| **NextAuth.js v5**               | Authentication (email, Google OAuth)                                         |
| **TanStack Query**               | Client-side data fetching                                                    |
| **Recharts**                     | Analytics charts                                                             |
| **qrcode** + **canvas**          | QR code generation (server-side)                                             |
| **Vercel**                       | Hosting                                                                      |
| **Cloudflare**                   | CDN, DNS                                                                     |
| **Vitest**                       | Unit/integration testing                                                     |
| **Playwright**                   | E2E testing                                                                  |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                         │
│           (DNS, caching, edge redirect rules)              │
└──────────────────────┬───────────────────────────────────┘
                       │
              ┌────────▼─────────┐
              │   Next.js 16     │
              │  (Vercel)        │
              │                  │
              │  ┌────────────┐  │
              │  │ App Router  │  │
              │  │             │  │
              │  │ • / (landing│  │
              │  │   + blog)   │  │
              │  │ • /app/*    │  │
              │  │   (dashboard│  │
              │  │   SPA)      │  │
              │  │ • /api/v1/* │  │
              │  │ • /:slug    │  │
              │  │   (redirect)│  │
              │  └────────────┘  │
              └────┬──────┬─────┘
                   │      │
          ┌────────▼┐ ┌──▼──────┐
          │PostgreSQL│ │  Redis   │
          │ (Neon)   │ │ (Upstash)│
          └─────────┘ └─────────┘
```

**Kenapa Next.js monolith, bukan microservices:**

- App Router menyatukan frontend + API routes dalam satu codebase
- Satu deployment di Vercel = simpler ops, lower cost
- RSC (React Server Components) untuk landing page = SEO sempurna
- API routes di `/api/v1/*` = backend logic
- `/:slug` dynamic route = redirect handler

**Click logging strategy:**

- Redirect handler: cek Redis cache slug→URL (if Link Page enabled? render page : redirect)
- Jika cache miss → PostgreSQL query → populate cache
- Log click event async via Edge Function atau Vercel Cron job batch insert
- Target: p50 <5ms, p99 <50ms

---

## Non-Functional Requirements

| Category             | Target                           |
| -------------------- | -------------------------------- |
| Redirect p50         | <5ms (Redis hit)                 |
| Redirect p99         | <50ms                            |
| Landing LCP          | <1.5s                            |
| API p95 reads        | <200ms                           |
| Auth latency         | <500ms                           |
| Concurrent redirects | 5,000 RPS (V1)                   |
| Uptime               | 99.5% (MVP), 99.9% (post-launch) |
| Accessibility        | WCAG 2.1 AA                      |
| Security             | OWASP Top 10 covered             |
| Backup               | Daily (Neon branching)           |
| RTO                  | <2 hours                         |

---

## Security

- **NextAuth.js v5** — JWT session strategy, httpOnly cookies
- **Password hashing** — bcrypt (via NextAuth credential provider)
- **OAuth 2.0 PKCE** — Google OAuth flow
- **Rate Limiting** — Redis-based, per IP (unauthenticated) / per user (authenticated)
- **CSRF Protection** — Next.js built-in + custom header validation
- **Input Validation** — Zod schemas on all API routes
- **Security Headers** — CSP, HSTS, X-Content-Type-Options via `next.config.ts`
- **SQL Injection Prevention** — Drizzle ORM parameterized queries
- **Midtrans Signature Verification** — SHA512 HMAC validation on webhooks
- **IP Hashing** — SHA256(ip + salt) for analytics, original IP discarded after 7 days

---

## Monorepo Structure

```
linksnap/
├── src/
│   ├── app/
│   │   ├── (marketing)/        # Landing, blog, pricing
│   │   │   ├── page.tsx
│   │   │   ├── blog/
│   │   │   └── pricing/
│   │   ├── (dashboard)/        # Protected dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── links/
│   │   │   ├── campaigns/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   ├── api/v1/             # API routes
│   │   │   ├── auth/
│   │   │   ├── links/
│   │   │   ├── campaigns/
│   │   │   ├── payments/
│   │   │   └── webhooks/
│   │   ├── [slug]/             # Link Page or Redirect
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── landing/            # Marketing page components
│   │   ├── dashboard/          # Dashboard components
│   │   └── link-page/          # Link Page renderer
│   ├── lib/
│   │   ├── db/                 # Drizzle schema + migrations
│   │   ├── auth/               # NextAuth config
│   │   ├── redis/              # Redis client
│   │   ├── analytics/          # Click processing
│   │   ├── geo/                # Geo IP lookup
│   │   ├── qr/                 # QR generation
│   │   ├── payments/           # Midtrans integration
│   │   └── utils/              # Shared utilities
│   ├── hooks/                  # React hooks
│   └── styles/
├── content/                    # MDX blog posts
├── public/                     # Static assets
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── _bmad-output/               # BMad planning artifacts
│   ├── planning-artifacts/
│   │   ├── PRD.md
│   │   ├── architecture.md
│   │   └── epics/
│   ├── implementation-artifacts/
│   │   └── sprint-status.yaml
│   └── project-context.md
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## Roadmap

| Phase                  | Duration                 | Deliverables                                                                       |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------- |
| **0. Setup**           | 3 hari                   | Next.js + shadcn/ui init, DB schema, Drizzle setup, Docker Compose, CI/CD skeleton |
| **1. Auth**            | 1 minggu                 | Register, login, Google OAuth, email verification, JWT session                     |
| **2. Core Links**      | 2 minggu                 | Short link CRUD, redirect endpoint + Redis cache, click logging, basic analytics   |
| **3. Link Pages**      | 2 minggu                 | Link Page CRUD, renderer, countdown timer, social proof, CTA customization         |
| **4. Smart Rules**     | 1.5 minggu               | Geo & Device rules engine, rule evaluation middleware, UI for rule management      |
| **5. QR Codes**        | 1 minggu                 | Server-side QR generation, PNG/SVG download, QR preview di dashboard               |
| **6. Campaigns**       | 1.5 minggu               | Campaign CRUD, UTM auto-builder, campaign analytics, link grouping                 |
| **7. Landing + Blog**  | 1.5 minggu               | Marketing pages (SSR/SSG), pricing page, demo generator, blog MDX (3 artikel)      |
| **8. Payments**        | 1.5 minggu               | Midtrans integration, subscription lifecycle, webhook, invoice email               |
| **9. Polish & Launch** | 1.5 minggu               | E2E testing, load testing, a11y audit, Lighthouse 90+, production deploy           |
| **Total**              | **~12 minggu (3 bulan)** |                                                                                    |

---

## Risks & Mitigations

| Risk                                           | Probability | Impact | Mitigation                                                        |
| ---------------------------------------------- | ----------- | ------ | ----------------------------------------------------------------- |
| Link Pages tidak appealing untuk sebagian user | Medium      | Low    | Opsional — user bisa skip dan langsung redirect                   |
| Smart Rules engine performance overhead        | Low         | Medium | Evaluasi rules di Redis (Lua script) sebelum redirect             |
| Midtrans webhook delay/failure                 | Low         | High   | Idempotent processing, reconciliation job, manual retry dashboard |
| Next.js cold starts di Vercel (free tier)      | Medium      | Medium | Edge config caching, keep warm via cron ping                      |
| Geo IP database accuracy                       | Low         | Low    | Gunakan MaxMind GeoLite2 (99.5% country accuracy)                 |
| Vercel/Neon/Upstash free tier limits           | Medium      | Low    | Usage monitoring, auto-alert sebelum limit                        |

---

## Key Decisions

1. **Next.js monolith** — Satu codebase, satu deployment. Tidak ada microservice hingga skala 50K+ users.
2. **Link Pages opsional** — User bisa toggle on/off per link. Default: off (redirect langsung).
3. **Smart Rules di Free tier** — Differentiator utama. Kompetitor kunci di enterprise, kita kasih gratis (limited).
4. **No custom domain di MVP** — Fokus ke core value dulu. Custom domain V2.
5. **PostgreSQL + Redis** — Cukup untuk V1. Tidak ada MongoDB/MQ awal.
6. **Bun sebagai package manager** — `bun install` untuk dependency, `bun run dev` untuk development.
7. **Tailwind + shadcn/ui** — Bukan custom CSS framework. Cepat, konsisten, aksesibel.

---

## Sign-off

| Role          | Name | Date | Signature |
| ------------- | ---- | ---- | --------- |
| Product Owner | Rafi |      |           |
| Developer     |      |      |           |
