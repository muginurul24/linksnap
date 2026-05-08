# LinkSnap — Implementation Checklist

> **For Codex:** Read this file BEFORE coding anything. It tells you exactly what to build, in what order, with what patterns, and what "done" looks like.

> **🔒 SECURITY MANDATE:** Before marking ANY task complete, verify the SECURITY.md checklist for that area. Every API route, every component, every query must pass security review. See `_bmad-output/planning-artifacts/SECURITY.md`.

> **📱 MOBILE APP:** See `_bmad-output/planning-artifacts/IMPLEMENTATION-MOBILE.md` for React Native implementation (24 tasks across 5 phases).

> **📓 JOURNAL:** After EVERY task, append an entry to `_bmad-output/implementation-artifacts/JOURNAL.md` following the format specified there. Claw Kun reviews the journal for quality control.

---

## 📋 Quick Reference

| Command | Purpose |
|---|---|
| `rtk bun run dev` | Start dev server |
| `rtk bun run build` | Production build |
| `rtk bun run test` | Run unit/integration tests |
| `rtk bun run test:e2e` | Run E2E tests |
| `rtk bun run typecheck` | TypeScript check |
| `rtk bun run lint` | Lint check |
| `rtk bun run db:push` | Push Drizzle schema to DB |
| `rtk bun run db:generate` | Generate migration files |

**Rules before you start any task:**
1. Read `_bmad-output/project-context.md` for conventions
2. Read `_bmad-output/planning-artifacts/PRD.md` for requirements
3. Prefix ALL terminal commands with `rtk`
4. Never skip typecheck after changes
5. Write tests alongside implementation

---

## 🗂️ Architecture Overview

```
src/
├── app/
│   ├── (marketing)/       # Public: landing, blog, pricing
│   ├── (dashboard)/       # Protected: all dashboard pages
│   ├── api/v1/            # API routes (auth, links, campaigns, payments)
│   ├── [slug]/page.tsx    # Redirect handler + Link Page renderer
│   └── layout.tsx         # Root (theme, tooltip, sonner)
├── lib/
│   ├── db/                # Drizzle schema, migrations, queries
│   ├── auth/              # NextAuth v5 config
│   ├── redis/             # Upstash Redis (cache, rate limiting)
│   ├── geo/               # Geo IP lookup
│   ├── qr/                # QR code generation
│   ├── payments/          # Midtrans integration
│   ├── email/             # Resend email templates
│   └── utils/             # Shared utilities
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── dashboard/         # Dashboard-specific components
│   └── landing/           # Marketing page components
└── hooks/                 # React hooks
```

---

## 🔴 Phase 0: Setup & Infrastructure (4 tasks)

### TASK 0.1 — Environment Setup
- [x] Copy `.env.example` to `.env`
- [x] Fill in ALL environment variables:
  - `DATABASE_URL` from Neon.tech
  - `AUTH_SECRET` — `openssl rand -base64 32`
  - `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET` from Google Cloud Console
  - `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` from Upstash
  - `RESEND_API_KEY` from Resend
  - `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` + `MIDTRANS_MERCHANT_ID`
- [x] Verify: `rtk bun run dev` starts without errors

### TASK 0.2 — Database Setup
- [x] Create Neon.tech database (or local PostgreSQL)
- [x] Push schema: `rtk bun run db:push`
- [x] Verify tables exist: direct `information_schema.tables` query
- [x] Tables to verify: `users`, `links`, `link_pages`, `smart_rules`, `click_events`, `campaigns`, `split_tests`, `split_test_prices`, `subscriptions`, `transactions`, `settings`

### TASK 0.3 — Redis Setup
- [x] Create Upstash Redis database
- [x] Verify connection: `redis.ping()` returned `PONG`
- [x] Test cache set/get: `await redis.set("test", "ok")` → `await redis.get("test")`

### TASK 0.4 — CI/CD Pipeline
- [x] Create `.github/workflows/ci.yml`
- [x] Steps: lint → typecheck → test → build → (staging deploy)
- [x] Add Vercel deployment hook

---

## 🟡 Phase 1: Authentication (8 tasks)

### TASK 1.1 — Auth Middleware
- [x] File: `src/proxy.ts` (Next.js 16 replacement for deprecated `src/middleware.ts`)
- [x] Export NextAuth proxy, protect `/dashboard/*` plus current dashboard paths (`/links`, `/analytics`, `/settings`, etc.)
- [x] Exclude: `/api/auth/*`, `/api/v1/auth/*`, `/_next/*`, static files
- [x] Redirect unauthenticated to `/login`

### TASK 1.2 — Register Page
- [x] File: `src/app/(marketing)/register/page.tsx`
- [x] Form: Email, Password, Confirm Password
- [x] Validation: Zod schema (email format, password ≥8 chars)
- [x] On submit: `POST /api/v1/auth/register` → redirect to verify page
- [x] Error states: duplicate email, weak password, rate limit
- [x] Loading state: button spinner

### TASK 1.3 — Email Verification
- [x] File: `src/app/(marketing)/verify/page.tsx`
- [x] Accept `?email=` query param
- [x] OTP input (6 digits)
- [x] Auto-submit after 6 digits
- [x] Resend OTP button (with cooldown timer)
- [x] On success: redirect to `/login?verified=true`

### TASK 1.4 — Login Page
- [x] File: `src/app/(marketing)/login/page.tsx`
- [x] Form: Email, Password
- [x] "Sign in with Google" button
- [x] "Forgot password?" link
- [x] Error states: invalid credentials, email not verified
- [x] On success: redirect to callback URL, default `/links` because `/dashboard` route does not currently exist

### TASK 1.5 — Google OAuth
- [x] Configure in Google Cloud Console: callback URL = `{APP_URL}/api/auth/callback/google` (configured for `http://localhost:3000/api/auth/callback/google`)
- [ ] Test flow end-to-end
- [x] Handle: new user auto-register, existing user link Google account

### TASK 1.6 — API Routes: Auth
- [x] File: `src/app/api/v1/auth/register/route.ts`
  - [x] Validate input (Zod)
  - [x] Check email not taken
  - [x] Hash password (bcryptjs)
  - [x] Generate OTP (6-digit)
  - [x] Send email via Resend
  - [x] Return `{ success: true }`
- [x] File: `src/app/api/v1/auth/verify/route.ts`
  - [x] Accept email + OTP
  - [x] Set `emailVerified` timestamp
  - [x] Return `{ success: true }`
- [x] File: `src/app/api/v1/auth/resend-otp/route.ts`
  - [x] Rate limit: 3 OTP/email/hour
  - [x] Generate new OTP, send email

### TASK 1.7 — Rate Limiting
- [x] File: `src/lib/redis/rate-limit.ts`
- [x] Implement: sliding window rate limiter
- [x] Apply to: login (5/IP/15min), register (3/IP/hour), OTP resend (3/email/hour)
- [x] Return: `{ limited: true, retryAfter: seconds }` or `{ limited: false }`

### TASK 1.8 — Auth Tests
- [x] Unit: password hashing, OTP generation, token validation
- [x] Integration: register → verify → login → access protected route
- [x] E2E: full auth flow (register → verify → login → dashboard)

---

## 🟢 Phase 2: Core Links (10 tasks)

### TASK 2.1 — Create Link API
- [x] File: `src/app/api/v1/links/route.ts` (POST)
- [x] Auth: required
- [x] Input: `{ destinationUrl, slug?, title? }`
- [x] Slug validation: 3-50 chars, alphanumeric + hyphens
- [x] Generate random 7-char slug if not provided
- [x] Check slug uniqueness
- [x] Check user quota (based on plan)
- [x] Return: `{ success: true, data: { id, slug, destinationUrl, shortUrl } }`

### TASK 2.2 — List Links API
- [x] File: `src/app/api/v1/links/route.ts` (GET)
- [x] Auth: required
- [x] Query params: `page`, `limit`, `search`, `campaignId`
- [x] Return paginated list: `{ success, data: [...], meta: { page, limit, total } }`

### TASK 2.3 — Get/Update/Delete Link API
- [x] File: `src/app/api/v1/links/[id]/route.ts`
- [x] GET: link details + click summary
- [x] PATCH: update destination, title, slug (only if not taken)
- [x] DELETE: soft delete
- [x] Auth: required, ownership check

### TASK 2.4 — Redirect Handler
- [x] File: `src/app/[slug]/page.tsx`
- [x] Logic:
  1. Check Redis cache for slug → URL mapping
  2. If cache miss: query PostgreSQL
  3. Check if link is active + not expired + not before scheduled time
  4. If `hasLinkPage === true`: Render Link Page component
  5. Else: Return permanent redirect via Next.js page redirect
  6. Log click event async (fire-and-forget)
- [x] Performance: p50 <5ms target supported by Redis-hit path; exact latency requires production instrumentation

### TASK 2.5 — Click Logging
- [x] File: `src/lib/analytics/click-logger.ts`
- [x] Capture: IP hash, country, city, referrer, user agent, device, browser, OS
- [x] IP → geo lookup via MaxMind GeoLite2
- [x] IP hashing: SHA256(ip + salt)
- [x] Async logging: uses Next.js `after()` background work from the redirect handler
- [x] Batch insert path: click insert helper accepts batches; Vercel Cron/Redis queueing remains the production scaling path

### TASK 2.6 — Link Analytics API
- [x] File: `src/app/api/v1/links/[id]/analytics/route.ts`
- [x] Auth: required, ownership check
- [x] Return:
  - Total clicks, unique clicks (by IP hash)
  - Clicks per day (last 30 days)
  - Top 5 countries, cities
  - Top 5 referrers
  - Device breakdown (mobile/desktop/tablet)
  - Browser breakdown
- [x] Query params: `from`, `to` (date range)

### TASK 2.7 — Create Link Form (Dashboard)
- [x] File: `src/app/(dashboard)/links/new/page.tsx`
- [x] Form fields: Destination URL, Custom slug (optional), Title (optional)
- [x] Live slug preview: `www.justqiu.cloud/your-slug`
- [x] Enable Link Page toggle → expands Link Page config
- [x] Enable Smart Rules toggle → expands rules config
- [x] Validation: URL format, slug availability check (debounced)
- [x] On success: toast + redirect to links list

### TASK 2.8 — Edit Link Page
- [x] File: `src/app/(dashboard)/links/[slug]/edit/page.tsx`
- [x] All fields from create form, pre-filled
- [x] Link Page edit section (if enabled)
- [x] Smart Rules edit section (if enabled)
- [x] Delete link button with confirmation dialog

### TASK 2.9 — Empty & Error States
- [x] Links list empty: "No links yet. Create your first short link!" with CTA button
- [x] Analytics empty (no clicks yet): "Waiting for clicks..." with share link CTA
- [x] 404 slug: "This link doesn't exist or has been removed" with create CTA
- [x] Rate limited: "Too many requests. Try again in X seconds."

### TASK 2.10 — Link Tests
- [x] Unit: slug generation, URL validation, quota checking
- [x] Integration: create → redirect → verify click logged
- [x] E2E: create link from dashboard → visit short URL → check analytics updated

---

## 🔵 Phase 3: Link Pages (6 tasks)

### TASK 3.1 — Link Page API
- [x] File: `src/app/api/v1/links/[id]/page/route.ts`
- [x] POST: create/update Link Page config
  - Input: `{ brandName, title, description, ogImage, ctaText, ctaColor, showCountdown, countdownTarget, showSocialProof, showQrCode, theme }`
- [x] GET: get Link Page config
- [x] Auth: required, ownership check

### TASK 3.2 — Link Page Public Renderer
- [x] File: `src/components/link-page/link-page-renderer.tsx`
- [x] Read Link Page config from API
- [x] Render:
  - [x] Brand logo + name (header)
  - [x] Title + description
  - [x] OG image (if provided)
  - [x] CTA button with custom text/color → redirect to destination
  - [x] Countdown timer (if enabled, countdown to target date)
  - [x] Social proof: "X people clicked this link"
  - [x] QR code display
  - [x] Footer: "Powered by LinkSnap"
- [x] Theme: auto (system), dark, light
- [x] Responsive: mobile-first, max-width 480px centered card

### TASK 3.3 — Countdown Timer Component
- [x] File: `src/components/link-page/countdown-timer.tsx`
- [x] Props: `targetDate: Date`
- [x] Display: DD:HH:MM:SS format
- [x] Pulse animation when <1 hour remaining
- [x] "Offer expired" state when past target date
- [x] Client component (useEffect timer)

### TASK 3.4 — Link Page Preview (Dashboard)
- [x] Add preview button in links table
- [x] Open modal showing live Link Page rendering
- [x] Mobile/desktop toggle in preview

### TASK 3.5 — Link Page Analytics
- [x] Page views (when Link Page is shown vs direct redirect)
- [x] CTA click-through rate
- [x] Countdown effectiveness (views with timer vs without)
- [x] Add to link analytics API

### TASK 3.6 — Link Page Tests
- [x] Unit: countdown timer logic, CTA URL construction
- [x] Integration: create Link Page → visit slug → verify page renders → click CTA → verify redirect
- [x] E2E: configure Link Page from dashboard → verify public rendering

---

## 🟣 Phase 4: Smart Redirect Rules (5 tasks)

### TASK 4.1 — Smart Rules API
- [x] File: `src/app/api/v1/links/[id]/rules/route.ts`
- [x] POST: create/update rules (batch)
  - Input: `{ rules: [{ type: "GEO"|"DEVICE"|"TIME"|"LANGUAGE", condition: {...}, destinationUrl, priority }] }`
- [x] GET: get all rules for a link
- [x] DELETE: delete individual rule
- [x] Auth: required, ownership check
- [x] Quota: check plan limit (Free: 2, Pro: 5, Business: unlimited)

### TASK 4.2 — Rule Evaluation Engine
- [x] File: `src/lib/rules/rule-engine.ts`
- [x] Input: request context (IP, user agent, timestamp, accept-language header)
- [x] Output: destination URL (or null if no rule matches)
- [x] Logic:
  1. [x] Fetch rules for slug (cached in Redis)
  2. [x] Sort by priority (descending)
  3. [x] For each rule, evaluate condition:
     - [x] GEO: match IP country against condition
     - [x] DEVICE: parse user agent → match device type
     - [x] TIME: match current time against time range
     - [x] LANGUAGE: match accept-language header
  4. [x] Return first matching rule's destination URL
  5. [x] If no rules match, return null → use default destination

### TASK 4.3 — Geo IP Lookup
- [x] File: `src/lib/geo/geoip.ts`
- [x] Use MaxMind GeoLite2 database (download to `data/GeoLite2-City.mmdb`)
- [x] Cache results in Redis: `geo:{ip}` → `{ country, city, region }`
- [x] TTL: 24 hours
- [x] Fallback: if IP is localhost/private → return null

### TASK 4.4 — Device Detection
- [x] File: `src/lib/geo/device-detector.ts`
- [x] Parse user agent string
- [x] Detect: mobile, tablet, desktop
- [x] Detect: browser (Chrome, Safari, Firefox, etc.)
- [x] Detect: OS (Windows, macOS, iOS, Android, Linux)
- [x] Use `ua-parser-js` library

### TASK 4.5 — Smart Rules Tests
- [x] Unit: rule evaluation for each type, device parsing
- [x] Integration: create rules → visit with different IPs/UAs → verify correct redirect
- [x] E2E: configure rules from dashboard → test with browser dev tools user agent override

---

## 🟠 Phase 5: QR Codes (3 tasks)

### TASK 5.1 — QR Generation API
- [x] File: `src/app/api/v1/qr/[slug]/route.ts`
- [x] No auth required (public endpoint)
- [x] Generate QR code as PNG or SVG (query param `?format=png|svg`)
- [x] Cache in Redis: `qr:{slug}:{format}` → base64 image
- [x] TTL: 24 hours (or until link updated)
- [x] Size: 300x300 default, configurable `?size=300`

### TASK 5.2 — QR Download
- [x] Add download buttons in links table and QR codes page
- [x] PNG download: `<a download="slug.png" href="/api/v1/qr/slug?format=png">`
- [x] SVG download: `<a download="slug.svg" href="/api/v1/qr/slug?format=svg">`

### TASK 5.3 — QR Tests
- [x] Integration: generate QR → verify it's valid → scan with phone → verify redirect
- [x] E2E: click download button → verify file downloads

---

## 🔴 Phase 6: Campaign Workbench (5 tasks)

### TASK 6.1 — Campaign API
- [x] File: `src/app/api/v1/campaigns/route.ts`
- [x] POST: create campaign `{ name, slug, description, utmSource, utmMedium, utmCampaign, utmTerm, utmContent }`
- [x] GET: list user campaigns (with link count)
- [x] File: `src/app/api/v1/campaigns/[id]/route.ts`
- [x] GET: campaign details
- [x] PATCH: update campaign (utm templates, name)
- [x] DELETE: delete campaign (links become ungrouped, not deleted)

### TASK 6.2 — Campaign Links API
- [x] File: `src/app/api/v1/campaigns/[id]/links/route.ts`
- [x] POST: add links to campaign `{ linkIds: [...] }`
- [x] DELETE: remove link from campaign `{ linkId }`
- [x] GET: list links in campaign (paginated)

### TASK 6.3 — Campaign Analytics API
- [x] File: `src/app/api/v1/campaigns/[id]/analytics/route.ts`
- [x] Return: aggregated analytics across all campaign links
- [x] Total clicks, clicks per day, top links, top countries
- [x] Compare campaigns: `?compare=ramadhan-2026,launch-q2-2026`

### TASK 6.4 — UTM Auto-Builder
- [x] File: `src/lib/campaigns/utm-builder.ts`
- [x] When adding link to campaign, auto-append UTM params to destination URL
- [x] Format: `?utm_source=X&utm_medium=Y&utm_campaign=Z&utm_term=W&utm_content=V`
- [x] Skip if destination URL already has UTM params
- [x] Show preview before saving

### TASK 6.5 — Campaign Tests
- [x] Unit: UTM builder, campaign analytics aggregation
- [x] Integration: create campaign → add links → verify UTM params → check analytics
- [x] E2E: full campaign workflow from dashboard

---

## ⚫ Phase 7: Split Testing (3 tasks)

### TASK 7.1 — Split Test API
- [x] File: `src/app/api/v1/links/[id]/split-test/route.ts`
- [x] POST: create/update split test `{ prices: [{ destinationUrl, weight }] }`
- [x] GET: get split test config + performance data
- [x] DELETE: remove split test
- [x] Auth: required, ownership check

### TASK 7.2 — Split Test Router
- [x] Integrate into redirect handler (`[slug]/page.tsx`)
- [x] If link has active split test:
  1. Calculate total weight
  2. Generate random number 0-totalWeight
  3. Select price based on weight range
  4. Log which price was selected
- [x] Increment `clickCount` on price

### TASK 7.3 — Split Test Tests
- [x] Unit: price selection algorithm
- [x] Integration: create split test → make 100 requests → verify distribution ≈ weights
- [x] E2E: configure A/B test from dashboard

---

## 🟤 Phase 8: Payments (5 tasks)

### TASK 8.1 — Midtrans Integration
- [x] File: `src/lib/payments/midtrans.ts`
- [x] Initialize Midtrans Snap client
- [x] Create transaction: `POST /api/v1/payments/create`
  - [x] Input: `{ plan, duration }`
  - [x] Calculate amount in IDR (USD price × `USD_IDR_RATE`)
  - [x] Generate Snap token
  - [x] Return: `{ snapToken, orderId }`

### TASK 8.2 — Payment Webhook
- [x] File: `src/app/api/v1/payments/webhook/route.ts`
- [x] Verify Midtrans signature (SHA512)
- [x] Handle notification types: `settlement`, `cancel`, `deny`, `expire`, `pending`
- [x] On settlement: create/upgrade subscription, update user plan
- [x] Idempotent: check `orderId` before processing
- [x] Send invoice email via Resend

### TASK 8.3 — Subscription Management
- [x] File: `src/lib/payments/subscription.ts`
- [x] Create subscription on successful payment
- [x] Check subscription status on dashboard load
- [x] Handle expiry: downgrade to Free plan
- [x] Handle renewal cron job (Vercel Cron)

### TASK 8.4 — Billing Page (API + Frontend)
- [x] File: `src/app/api/v1/payments/history/route.ts`
- [x] Return user's transaction history (paginated)
- [x] Dashboard billing page already created — connect to real data
- [x] Show: current plan, billing history, next billing date, upgrade CTA

### TASK 8.5 — Payment Tests
- [x] Unit: Midtrans signature verification, amount calculation
- [x] Integration: create transaction → mock webhook → verify subscription created
- [x] E2E: full payment flow (use Midtrans sandbox)

---

## 🟢 Phase 9: Public Site (4 tasks)

### TASK 9.1 — Landing Page
- [x] File: `src/app/(marketing)/page.tsx`
- [x] Sections: Hero, Features (6 cards), Pricing, Demo Generator, Testimonials
- [x] Demo Generator: input URL → generate short link live (no auth)
- [x] CTA: "Get Started Free" → `/register`, "Try Demo" → scroll to demo
- [x] SEO: meta tags, OG image, structured data

### TASK 9.2 — Pricing Page
- [x] File: `src/app/(marketing)/pricing/page.tsx`
- [x] Monthly/annual toggle
- [x] 3 plan cards: Free, Pro, Business
- [x] Feature comparison table
- [x] FAQ section

### TASK 9.3 — Blog
- [x] File: `src/app/(marketing)/blog/page.tsx`
- [x] List articles from MDX content
- [x] Each article: `src/content/blog/{slug}.mdx`
- [x] Minimum 3 articles for launch:
  1. "Why Your Short Links Are Costing You Conversions"
  2. "Smart Redirect Rules: The Marketing Hack Nobody Uses"
  3. "How Link Pages 5x'd Our Click-Through Rate"

### TASK 9.4 — Public Site Tests
- [x] Lighthouse: target 90+ on all public pages
- [x] E2E: landing → pricing → demo generator → register
- [x] A11y: WCAG 2.1 AA audit

---

## 🔵 Phase 10: Polish & Launch (5 tasks)

### TASK 10.1 — Error Handling & Logging
- [x] Global error boundary (app/error.tsx)
- [x] Global not-found page (app/not-found.tsx)
- [x] API error standardization: `{ success: false, error: { code, message, requestId } }`
- [x] Structured logging with requestId

### TASK 10.2 — Loading States
- [x] Dashboard skeleton (matching layout grid)
- [x] Table skeleton (rows × columns)
- [x] Chart skeleton (placeholder area chart)
- [x] Button loading spinners
- [x] Suspense boundaries on all async pages

### TASK 10.3 — SEO & Metadata
- [x] `generateMetadata()` on all public pages
- [x] Sitemap generation (`sitemap.ts`)
- [x] Robots.txt (`robots.ts`)
- [x] JSON-LD structured data (Organization, WebApplication)

### TASK 10.4 — Security Audit
- [x] OWASP Top 10 checklist
- [x] SQL injection: verify all queries use Drizzle parameterized
- [x] XSS: verify all user content is sanitized
- [x] CSRF: verify state-changing requests have token
- [x] Rate limiting: verify all public endpoints are rate-limited
- [x] Security headers: CSP, HSTS, X-Frame-Options, etc.

### TASK 10.5 — Launch Checklist
- [ ] Production environment variables set
- [x] Custom domain configured (`justqiu.cloud` redirects to `www.justqiu.cloud`)
- [x] SSL certificate active
- [x] Database indexes verified
- [x] Redis cache warming
- [x] Monitoring/alerting configured (baseline scheduled production smoke)
- [ ] Backup strategy verified
- [ ] Load test: 5000 concurrent redirects
- [x] Penetration test (basic)
- [ ] Go-live! 🚀

---

## 📐 Code Patterns Reference

### API Route Pattern
```typescript
// src/app/api/v1/links/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { createLinkSchema } from "@/lib/validations/link";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { code: "AUTHENTICATION_REQUIRED", message: "Login required", requestId: crypto.randomUUID() } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten(), requestId: crypto.randomUUID() } },
        { status: 400 }
      );
    }

    const slug = parsed.data.slug || generateSlug();
    const [link] = await db.insert(links).values({
      userId: session.user.id,
      slug,
      destinationUrl: parsed.data.destinationUrl,
      title: parsed.data.title,
    }).returning();

    return NextResponse.json({ success: true, data: { ...link, shortUrl: `https://www.justqiu.cloud/${slug}` } }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/v1/links]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId: crypto.randomUUID() } },
      { status: 500 }
    );
  }
}
```

### Database Query Pattern
```typescript
// src/lib/db/queries/links.ts
import { db } from "@/lib/db";
import { links, clickEvents } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function getUserLinks(userId: string, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const data = await db.select().from(links)
    .where(eq(links.userId, userId))
    .orderBy(desc(links.createdAt))
    .limit(limit).offset(offset);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(links)
    .where(eq(links.userId, userId));
  return { data, meta: { page, limit, total: count } };
}
```

### Form Validation Pattern
```typescript
// src/lib/validations/link.ts
import { z } from "zod";

export const createLinkSchema = z.object({
  destinationUrl: z.string().url("Must be a valid URL"),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens").optional(),
  title: z.string().max(255).optional(),
});
```

---

## 🎯 States Checklist (every component must handle these)

For EVERY interactive component, implement these states:

| State | UI | Example |
|---|---|---|
| **Loading** | Skeleton or spinner | `<Skeleton className="h-8 w-32" />` |
| **Empty** | Friendly message + CTA | "No links yet. Create one!" |
| **Error** | Toast + retry button | `<SonnerToast type="error" />` |
| **Success** | Toast + visual feedback | `<SonnerToast type="success" />` |
| **Disabled** | Grayed out + tooltip | `disabled` prop on button |
| **Edge case** | Handle gracefully | 500 links on one page? Paginate! |

---

## 🔴 Phase 11: Security Hardening (MANDATORY before production)

> **Reference:** `_bmad-output/planning-artifacts/SECURITY.md` for full checklist

### SEC-ALL — Security Implementation
- [x] Read `_bmad-output/planning-artifacts/SECURITY.md` completely
- [ ] Implement all 16 security categories (Access Control, Cryptography, Injection, XSS, CSRF, Misconfiguration, DDoS, N+1, Input Validation, SSRF, Auth Security, Payment Security, Data Protection, Dependencies, Logging, Infrastructure)
- [x] Run security code audit commands (see SECURITY.md § Code-Level Verification)
- [ ] Fix all findings before marking complete
- [ ] Verify zero HIGH severity issues
- [x] Document any accepted risks in JOURNAL.md

---

---

## 🔴 Phase 12: Post-Audit Fixes (Claw Kun Audit — 2026-05-07)

> **Source:** Claw Kun product audit. Fix critical UX bugs, unify pricing, connect dashboard to real data, and add missing enforcement.

### TASK 12.1 — Forgot Password Flow
- [x] Create `src/app/(marketing)/forgot-password/page.tsx` — email input form
- [x] Create `src/app/api/v1/auth/forgot-password/route.ts` — POST: accept email, generate reset token (1-hour expiry), send email via Resend
- [x] Create `src/app/(marketing)/reset-password/page.tsx` — accept `?token=` query param, new password + confirm password form
- [x] Create `src/app/api/v1/auth/reset-password/route.ts` — POST: validate token, update password hash, invalidate token
- [x] Add `resetTokens` table to `src/lib/db/schema.ts` (id, userId, token, expiresAt, usedAt)
- [x] Run `rtk bun run db:push`
- [x] Rate limit: 3 requests/email/hour
- [x] Tests: unit (token generation/expiry), integration (forgot → reset → login)

### TASK 12.2 — Fix Sign Out
- [x] File: `src/components/dashboard/app-sidebar.tsx`
- [x] Import client-safe `signOut` from `next-auth/react`
- [x] Add `onClick={() => signOut({ callbackUrl: "/" })}` to the "Sign Out" `DropdownMenuItem`
- [x] Verify: sign-out handler redirects to landing page and is covered by unit test; NextAuth client clears the session

### TASK 12.3 — Connect Dashboard Overview to Real Data
- [x] File: `src/app/(dashboard)/dashboard/page.tsx`
- [x] Replace ALL hardcoded mock data with real DB queries:
  - Stats cards: query total links count, today's clicks (from `clickEvents`), active campaigns count, QR scans
  - Click trend chart: query daily click counts for last 7 days from `clickEvents`
  - Top countries chart: query top 5 countries by click count from `clickEvents`
  - Recent links table: query latest 5 links with click counts from `links` + `clickEvents`
- [x] Make page `async` server component
- [x] Add empty state when user has 0 links (show "Create your first link" CTA)
- [x] Add loading state via `loading.tsx` (already exists)
- [x] Tests: unit (data transformation), integration (dashboard API response)

### TASK 12.4 — Unify Plan Definitions (Single Source of Truth)
- [x] Create `src/lib/plans/definitions.ts` — export a single `PLANS` constant array with all plan metadata (name, price, period, description, features[], limits, highlighted, cta)
- [x] `features` must be an exhaustive list of ALL features per plan, matching actual `limits.ts` values
- [x] Refactor `src/components/landing/landing-page.tsx` — use `PLANS` instead of inline definition
- [x] Refactor `src/components/landing/pricing-page.tsx` — use `PLANS` instead of inline definition
- [x] Refactor `src/app/(dashboard)/settings/billing/page.tsx` — use `PLANS` instead of inline definition
- [x] Verify: all 3 pages show identical features, prices, and limits
- [x] Tests: unit (plan data integrity — no missing fields, prices match limits)

### TASK 12.5 — Fix Sidebar Dynamic Data
- [x] File: `src/components/dashboard/app-sidebar.tsx`
- [x] Make sidebar a server component (or accept session as prop)
- [x] Replace hardcoded "Free Plan" with actual plan name from user session
- [x] Replace hardcoded "Rafi" + "rafi@email.com" with `session.user.name` + `session.user.email`
- [x] Fallback: show "User" and "user@email.com" as avatar fallback if no name
- [x] Tests: unit (sidebar renders correct plan label per plan type)

### TASK 12.6 — Fix Dashboard App Bar Issues
- [x] File: `src/components/dashboard/app-header.tsx`
- [x] Fix breadcrumb "Dashboard" link: change `href: "/"` → `href: "/dashboard"`
- [x] Either implement search functionality (filter links by slug/destination) or remove the search input
- [x] Either wire bell icon to a notifications dropdown or remove it
- [x] Tests: update breadcrumb test expectations

### TASK 12.7 — Add Missing Quota Enforcement
- [x] File: `src/lib/links/limits.ts`
- [x] Add `CAMPAIGN_QUOTAS` — FREE: 1, PRO: 10, BUSINESS: Infinity
- [x] Add `QR_QUOTAS` — FREE: 10, PRO: 100, BUSINESS: 500
- [x] Add `getCampaignQuota(plan)` and `getQrQuota(plan)` functions
- [x] Add `hasReachedCampaignQuota(plan, count)` and `hasReachedQrQuota(plan, count)`
- [x] Enforce campaign quota in `POST /api/v1/campaigns`
- [x] Enforce QR quota in `POST /api/v1/qr/[slug]` (or relevant create endpoint)
- [x] Tests: unit (quota boundary checks), integration (quota enforcement in API)

### TASK 12.8 — Landing Page Hero Stats
- [x] File: `src/components/landing/landing-page.tsx`
- [x] Either make the hero component `async` and query real aggregate stats from DB
- [x] Or keep as static but update to realistic numbers (avoid pre-launch inflation like "1M+ redirects")
- [x] Replace "308" redirect count with a meaningful feature-based stat
- [x] Tests: if dynamic, integration test the stats query

### TASK 12.9 — API Rate Limit Documentation Fix
- [x] File: `src/lib/plans/definitions.ts` (created in 12.4)
- [x] Document actual API rate limits: FREE: 30/min, PRO: 60/min, BUSINESS: 120/min
- [x] Update all plan feature lists to show correct rate limit numbers
- [x] Or adjust `limits.ts` to match marketed numbers — pick one direction and be consistent
- [x] Tests: unit (plan definitions match limits.ts values)

### TASK 12.10 — Fix Forgot Password Dead Link (Quick Fix)
- [x] If 12.1 is deferred: temporarily remove the "Forgot password?" link from `login-form.tsx` (skipped; 12.1 is complete)
- [x] Add a comment: `{/* TODO: Implement forgot password flow — see Task 12.1 */}` (skipped; 12.1 is complete)
- [x] If 12.1 is done first: skip this task

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

### TASK 12.11 — Fix Sidebar Active Route for Settings
- [x] File: `src/components/dashboard/app-sidebar.tsx`
- [x] The `isActive` function uses `pathname.startsWith(url)` for all routes
- [x] Bug: when on `/settings/billing`, both "Settings" AND "Billing" highlight because `/settings/billing` starts with `/settings`
- [x] Fix: add special case like dashboard: `if (url === "/settings") return pathname === "/settings"`
- [x] This ensures `/settings/billing` only highlights "Billing", not "Settings"
- [x] Tests: unit (sidebar active state for `/settings` vs `/settings/billing`)

### TASK 12.12 — API Documentation Page (Paid Users)
- [x] Create `src/app/(dashboard)/docs/page.tsx` — API reference page
- [x] Gate access: redirect FREE users to `/settings/billing` with upgrade prompt
- [x] Content: list all `/api/v1/*` endpoints with method, path, auth required, rate limit, request/response examples
- [x] Sections: Authentication (API keys), Links API, Link Pages API, Campaigns API, QR API, Analytics API, Smart Rules API, Payments API
- [x] Show user's API key(s) with copy button (header format shown; real key CRUD remains Task 12.13)
- [x] Add sidebar nav item: "API Docs" with `BookOpen` icon, shown only for PRO/BUSINESS
- [x] Create `src/app/api/v1/docs/route.ts` — GET: return OpenAPI JSON spec
- [x] Tests: unit (docs page gating), integration (OpenAPI spec validity)

### TASK 12.13 — API Keys Management (Settings Tab)
- [x] File: `src/app/(dashboard)/settings/page.tsx` — "API Keys" tab
- [x] Replace mock "Upgrade to Pro" gate with real API key management for PRO/BUSINESS
- [x] Add `apiKeys` table to `src/lib/db/schema.ts` (id, userId, name, keyHash, keyPrefix, lastUsedAt, createdAt)
- [x] Create `src/app/api/v1/settings/api-keys/route.ts` — GET (list keys), POST (create key)
- [x] Create `src/app/api/v1/settings/api-keys/[id]/route.ts` — DELETE (revoke key)
- [x] Show masked key on creation only (e.g. `lsnap_sk_xxxx...xxxx`), hash stored in DB
- [x] Auth: API key passed as `Authorization: Bearer lsnap_sk_xxx` header
- [x] Add API key auth to `src/lib/auth/api-key.ts` — validate key, attach user to request
- [x] Integrate API key auth into proxy guard (allow API key OR session cookie)
- [x] Tests: unit (key hashing, prefix validation), integration (CRUD + auth with key)

### TASK 12.14 — Connect Settings Tabs to Real APIs
- [x] File: `src/app/(dashboard)/settings/page.tsx`
- [x] "Profile" tab: load user name/email from session, save via `PATCH /api/v1/settings/profile`
- [x] Create `src/app/api/v1/settings/profile/route.ts` — PATCH: update name
- [x] "Security" tab: connect "Change Password" to `POST /api/v1/auth/change-password`
- [x] Create `src/app/api/v1/auth/change-password/route.ts` — POST: verify current password, update hash
- [x] "Notifications" tab: save preferences to user record (add `notifications` JSON column)
- [x] Remove all hardcoded values ("Rafi", "rafi@email.com")
- [x] Tests: unit (form validation), integration (profile update, password change flow)

### TASK 12.15 — Connect Link Pages Dashboard to Real Data
- [x] File: `src/app/(dashboard)/pages/page.tsx`
- [x] Make page `async` server component
- [x] Query real link pages from DB via `listLinkPagesByUserId` query
- [x] Replace ALL hardcoded mock data array
- [x] Add empty state when user has 0 link pages
- [x] Add loading state (already has loading.tsx skeleton)
- [x] Add create/edit links to actual link page form
- [x] Tests: integration (link pages list API response)

### TASK 12.16 — Connect Campaigns Dashboard to Real Data
- [x] File: `src/app/(dashboard)/campaigns/page.tsx`
- [x] Make page `async` server component
- [x] Query real campaigns from DB via `listCampaignsByUserId` query (already exists)
- [x] Replace ALL hardcoded mock data array
- [x] Create `src/app/(dashboard)/campaigns/new/page.tsx` — campaign creation form (the route is currently a 404!)
- [x] Add empty state when user has 0 campaigns
- [x] Add loading state (create `loading.tsx`)
- [x] Wire "Edit" and "Delete" dropdown actions
- [x] Tests: integration (campaigns list API, create campaign flow)

### TASK 12.17 — Connect Analytics Dashboard to Real Data
- [x] File: `src/app/(dashboard)/analytics/page.tsx`
- [x] Make page `async` server component
- [x] Query real analytics from DB:
  - Daily click counts for last 7/30 days from `clickEvents`
  - Device breakdown (mobile/desktop/tablet) from `clickEvents.userAgent`
  - Top referrers from `clickEvents.referrer`
  - Top countries from `clickEvents.country`
- [x] Add date range picker (last 7 days, 30 days, 90 days, custom)
- [x] Add "Export CSV" button
- [x] Replace ALL empty mock arrays with real data
- [x] Add loading state (already has loading.tsx)
- [x] Tests: unit (data aggregation), integration (analytics API queries)

### TASK 12.18 — Post-Payment Checkout Pages
- [x] Create `src/app/(marketing)/checkout/success/page.tsx`
  - Accept `?order_id=` query param
  - Show success message with plan name, next billing date
  - "Go to Dashboard" CTA button
- [x] Create `src/app/(marketing)/checkout/cancel/page.tsx`
  - Show "Payment was cancelled" message
  - "Try Again" link back to `/settings/billing`
- [x] Update Midtrans Snap payload to include `redirect_url` finish/error/unfinish callbacks
- [x] Tests: unit (checkout page renders), integration (payment flow end-to-end)

### TASK 12.19 — Individual Blog Post Pages
- [x] Create `src/app/(marketing)/blog/[slug]/page.tsx`
- [x] Read MDX file from `src/content/blog/[slug].mdx`
- [x] Render MDX content with basic styling (headings, paragraphs, lists, code blocks)
- [x] Add metadata: title, description, OpenGraph from frontmatter
- [x] Add "Back to Blog" link at top
- [x] Add loading state
- [x] Wire up blog card links from `/blog` page (currently cards have no links)
- [x] Tests: unit (MDX rendering), integration (blog post page)

### TASK 12.20 — Legal Pages
- [x] Create `src/app/(marketing)/terms/page.tsx` — Terms of Service
- [x] Create `src/app/(marketing)/privacy/page.tsx` — Privacy Policy
- [x] Add footer links to Terms and Privacy on landing page and blog
- [x] Add to sitemap
- [x] Tests: unit (pages render correctly)

### TASK 12.21 — Midtrans Redirect URL Configuration
- [x] File: `src/app/api/v1/payments/create/route.ts`
- [x] Update `createMidtransSnapTransaction` payload to include `callbacks.finish` → `{APP_URL}/checkout/success?order_id={order_id}`
- [x] Add `callbacks.error` and `callbacks.unfinish` URLs
- [x] Ensure redirect URLs work with production domain
- [x] Tests: verify Snap payload includes correct callback URLs

### TASK 12.22 — Search Implementation
- [x] File: `src/components/dashboard/app-header.tsx`
- [x] Wire search input to actually filter links by slug or destination
- [x] Debounce input (300ms), redirect to `/links?search=query`
- [x] Or: if keeping it simple, use GET param on links page directly
- [x] Tests: unit (search query building)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 12.1 → 12.2 → 12.3 → 12.4 → 12.5 → 12.6 → 12.7 → 12.8 → 12.9 → 12.10 → 12.11 → 12.12 → 12.13 → 12.14 → 12.15 → 12.16 → 12.17 → 12.18 → 12.19 → 12.20 → 12.21 → 12.22

**Estimated total:** 54 + 22 + 5 = 81 tasks

---

## 🟣 Phase 13: Smart Rules V2 — User-Friendly UX Overhaul

> **Source:** Rafi product spec — 2026-05-07. Replace cryptic manual input with intuitive visual builder. Rules engine stays the same; only the UX layer changes.

### Design Decisions (Claw Kun)

| Decision | Choice | Rationale |
|---|---|---|
| Active/Inactive toggle | **Per-rule** | User can experiment without deleting rules; individual on/off |
| Rule priority | **Ordered, first-match-wins** | Simple and predictable — like firewall rules; no complex cascade |
| Bot detection | **User-agent pattern matching** | Predefined bot list + custom patterns; 95% accuracy without heavy infra |
| Country selector | **Searchable combobox** | ISO 3166-1 country list; user types to filter, no manual typing |
| "No Redirect" | **Normal redirect to moneysite** | When smart rules disabled (inactive), ALL visitors go to moneysite — behaves like normal short link |

### TASK 13.1 — Searchable Country Combobox Component
- [x] Create `src/components/smart-rules/country-combobox.tsx`
- [x] Use shadcn `Command` (cmdk) component for searchable dropdown
- [x] Load ISO 3166-1 country list: name + code (e.g., "Indonesia" / "ID")
- [x] Features: type to filter, keyboard navigation, flag emoji per country
- [x] Export selected country code to parent form
- [x] Placeholder: "Search country..."
- [x] Handle edge case: no results found → show "No country found"
- [x] Tests: unit (search filter, selection, keyboard nav)

### TASK 13.2 — Smart Rule Builder Form (Visual)
- [x] Create `src/components/smart-rules/rule-builder.tsx`
- [x] Replace current manual JSON/text input with visual form:
  ```
  ┌─────────────────────────────────────────┐
  │ Rule #1                          [Active ◆] │
  │ ┌─────────────┐ ┌──────────┐ ┌──────────┐ │
  │ │ IF ▼        │ │ country ▼│ │ = Indo… ▼│ │
  │ │   country   │ │   is     │ │ Indonesia │ │
  │ └─────────────┘ └──────────┘ └──────────┘ │
  │ ┌─────────────┐ ┌──────────┐ ┌──────────┐ │
  │ │ AND ▼       │ │ device ▼ │ │ = Mobi… ▼│ │
  │ │   device    │ │   is     │ │ Mobile    │ │
  │ └─────────────┘ └──────────┘ └──────────┘ │
  │                                            │
  │ → Redirect to: [https://tokopedia.com/...] │
  │                                            │
  │ [+ Add Condition]  [🗑 Delete Rule]        │
  └─────────────────────────────────────────┘
  ```
- [x] Condition types: country, device, bot, time (date range)
- [x] Operator per condition: `is`, `is not`
- [x] Value selector changes based on type:
  - country → `CountryCombobox` (searchable)
  - device → dropdown: Mobile, Desktop, Tablet
  - bot → predefined checkboxes (Googlebot, Bingbot, Facebook, Twitter, etc.) + custom input
  - time → date range picker (start/end)
- [x] Each rule has: toggle (active/inactive), destination URL input
- [x] "+ Add Rule" button appends new rule at bottom
- [x] Rules are reorderable (drag handle or up/down arrows)
- [x] Fallback: "Default destination" field at the bottom (used when no rules match)
- [x] Readable summary below each rule: "IF country is Indonesia → moneysite.com"
- [x] Tests: unit (form validation, add/remove/reorder rules, condition rendering)

### TASK 13.3 — Rule Engine Logic (Ordered Priority)
- [x] File: `src/lib/rules/rule-engine.ts`
- [x] Rules are evaluated in display order (first rule = highest priority)
- [x] Logic per rule:
  1. Check if `isActive === false` → skip to next rule
  2. Check ALL conditions with AND logic (all must match)
  3. If all conditions match → return rule's destination URL (first-match-wins)
  4. If no conditions match → continue to next rule
- [x] If smart rules toggle is OFF (inactive for entire link): ALL visitors → moneysite (normal redirect, ignore rules)
- [x] If smart rules toggle is ON but NO rules match:
  - If fallback/default destination URL is set → redirect there
  - If no fallback → redirect to moneysite (default destination)
- [x] Bot detection: parse `user-agent` header against predefined pattern list
  - Predefined bots: Googlebot, Bingbot, FacebookExternalHit, Twitterbot, Slurp, DuckDuckBot, Baiduspider, YandexBot, AhrefsBot, SemrushBot, GPTBot, Claude-Web, CCBot
  - Case-insensitive substring match (simpler than regex for bot detection, handles UA variations)
- [x] Country detection: already handled by `src/lib/geo/geoip.ts` (MaxMind GeoLite2)
- [x] Device detection: already handled by `src/lib/geo/device-detector.ts`
- [x] Tests: unit (rule matching, priority order, bot detection, inactive rules, no-match fallback)

### TASK 13.4 — Smart Rules API Update
- [x] File: `src/app/api/v1/links/[id]/rules/route.ts`
- [x] Update schema to support ordered rules array with priority
- [x] New rule schema `smartRuleV2Schema`:
  ```typescript
  {
    isActive: boolean
    conditions: Array<{
      type: "country" | "device" | "bot" | "time"
      operator: "is" | "is_not"
      value: string | string[]  // single value or array for bot
    }>
    destinationUrl: string
  }
  ```
- [x] Add `fallbackDestinationUrl` field to link's rules config
- [x] GET returns rules in display order
- [x] POST/PUT accepts ordered rules array (order = priority)
- [x] Backward compatible: existing rules format still works (migration not required)
- [x] Tests: integration (CRUD v2 rules, ordering, validation)

### TASK 13.5 — Integrate into Link Form & Redirect Handler
- [x] File: `src/app/(dashboard)/links/link-form.tsx`
- [x] Replace current smart rules section with `RuleBuilder` component
- [x] "Enable Smart Rules" toggle → expands RuleBuilder
- [x] Preview summary: shows readable rule list before save
- [x] File: `src/app/[slug]/page.tsx` (redirect handler)
- [x] Integrate ordered rule evaluation from rule-engine.ts
- [x] Fallback logic: default destination → 404
- [x] Keep existing click logging + analytics intact
- [x] Tests: integration (full flow: create rules → visit link → verify redirect)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 13.1 → 13.2 → 13.3 → 13.4 → 13.5

**Estimated total:** 81 tasks

> **Note:** Phase 14 (Stripe) and Phase 15 (Paddle) were removed — global payment gateway deferred. Midtrans only for now.

## 🟣 Phase 14: Remove Stripe — Revert to Midtrans-Only

> **Source:** Rafi — 2026-05-07. Global payment gateway deferred. Remove all Stripe integration code from Phase 14, revert gateway selector to Midtrans-only.

### TASK 14.1 — Remove Stripe Dependencies
- [x] `rtk bun remove stripe`
- [x] Delete all Stripe files:
  - `src/lib/payments/stripe.ts`
  - `src/lib/payments/stripe-checkout.ts`
  - `src/lib/payments/stripe-webhook.ts`
  - `src/app/api/v1/payments/stripe/create/route.ts`
  - `src/app/api/v1/payments/stripe/webhook/route.ts`
- [x] Remove Stripe env vars from `.env` and `.env.example`:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_IS_TEST_MODE`
- [x] Remove Stripe from CSRF exemption list in `src/proxy.ts`
- [x] Tests: verify zero Stripe references in `src/`

### TASK 14.2 — Revert Gateway Selector to Midtrans-Only
- [x] File: `src/app/(dashboard)/settings/billing/page.tsx`
- [x] Remove dual gateway selector UI (radio buttons)
- [x] Revert to single "Upgrade" button per plan — one gateway only
- [x] File: `src/app/(dashboard)/settings/billing/upgrade-button.tsx`
- [x] Remove `gateway` prop — always use Midtrans endpoint
- [x] Clean up country detection logic added for gateway selection
- [x] Tests: unit (billing page renders single gateway)

### TASK 14.3 — Cleanup Transaction & DB References
- [x] Remove `gateway` column from `transactions` table schema (Drizzle schema)
- [x] Remove gateway badge/column from billing history table
- [x] Drop `gateway` column from DB: `rtk bun run db:push`
- [x] Remove gateway-related types/interfaces
- [x] Tests: integration (billing history without gateway column)

### TASK 14.4 — Remove Stripe Tests
- [x] Delete Stripe test files:
  - `tests/unit/stripe-*.test.ts`
  - `tests/integration/stripe-*.test.ts`
  - Any E2E tests referencing Stripe
- [x] Run full test suite — all remaining tests must pass
- [x] Typecheck + lint must be clean
- [x] Build must pass

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 14.1 → 14.2 → 14.3 → 14.4

**Estimated total:** 85 + 12 = 97 tasks

---

## 🔴 Phase 15: UX Hardening — User-Friendly Refinements

> **Source:** Rafi + Claw Kun UX audit — 2026-05-07. Fix authentication redirects, plan-gate features visually, disable/hide controls for FREE users, and improve overall UX polish.

### TASK 15.1 — Redirect Logged-In Users from Auth Pages
- [x] File: `src/app/(marketing)/login/page.tsx`
  - Make `async` server component
  - Call `auth()` — if session exists → `redirect("/dashboard")`
- [x] File: `src/app/(marketing)/register/page.tsx`
  - Same: if session exists → `redirect("/dashboard")`
- [x] File: `src/app/(marketing)/verify/page.tsx`
  - If session exists AND user is verified → `redirect("/dashboard")`
  - If session exists but not verified → allow verify page
- [x] File: `src/app/(marketing)/forgot-password/page.tsx`
  - If session exists → `redirect("/dashboard")`
- [x] File: `src/app/(marketing)/reset-password/page.tsx`
  - If session exists → `redirect("/dashboard")`
- [x] Tests: unit (redirect behavior for authed users on each auth page)

### TASK 15.2 — Create Reusable `PlanGate` Component
- [x] Create `src/components/plan-gate.tsx` — reusable component for plan-gated features:
  ```tsx
  <PlanGate
    allowed={userPlan !== "FREE"}
    upgradeMessage="Custom slugs require Pro or Business plan"
    upgradeUrl="/settings/billing?upgrade=custom-slug"
  >
    <Input id="slug" ... />
  </PlanGate>
  ```
- [x] Behavior:
  - If `allowed === true` → render children normally
  - If `allowed === false` → wrap children in a disabled container:
    - Show lock icon (🔒) next to label
    - Show `upgradeMessage` as muted text below the control
    - Show "Upgrade →" link pointing to `upgradeUrl`
    - Children inputs get `disabled` prop applied
- [x] Also support `PlanGate.Quota` variant for quota-exhausted cases:
  ```tsx
  <PlanGate.Quota
    used={3}
    limit={3}
    upgradeMessage="Link Page quota reached (3/3)"
    upgradeUrl="/settings/billing"
  >
    <Switch ... />
  </PlanGate.Quota>
  ```
- [x] Tests: unit (render children when allowed, show gate when not, quota display)

### TASK 15.3 — Hide Upgrade Card for Paid Users
- [x] File: `src/components/dashboard/app-sidebar.tsx`
- [x] The "Upgrade to Pro" card is currently shown for ALL users (including PRO and BUSINESS)
- [x] Fix: wrap the upgrade card in `{plan === "FREE" && (...)}`
- [x] The card should only render when `plan === "FREE"`
- [x] Tests: unit (sidebar upgrade card visibility per plan)

### TASK 15.4 — Plan-Gate Smart Rules & Link Page Toggles
- [x] File: `src/app/(dashboard)/links/link-form.tsx`
- [x] Pass `userPlan` from parent to LinkForm
- [x] For FREE users:
  - "Enable Link Page" toggle → disabled with tooltip: "Link Pages require Pro plan"
  - "Enable Smart Rules" toggle → disabled with tooltip: "Smart Rules require Pro plan"
  - Greyed out, not clickable
- [x] For PRO/BUSINESS: toggles work as normal
- [x] File: `src/app/(dashboard)/links/new/page.tsx` — pass `userPlan` to form
- [x] File: `src/app/(dashboard)/links/[slug]/edit/page.tsx` — pass `userPlan` to form
- [x] Tests: unit (toggle states per plan)

### TASK 15.5 — Add Back Navigation to Create/Edit Pages
- [x] File: `src/app/(dashboard)/links/new/page.tsx` — add "← Back to Links" link at top
- [x] File: `src/app/(dashboard)/links/[slug]/edit/page.tsx` — add "← Back to Links" link
- [x] File: `src/app/(dashboard)/campaigns/new/page.tsx` — add "← Back to Campaigns" link
- [x] File: `src/app/(dashboard)/campaigns/[id]/edit/page.tsx` — add "← Back to Campaigns" link
- [x] Use consistent styling: small text link with arrow, positioned above the form title
- [x] Tests: unit (back link renders with correct href)

### TASK 15.6 — Form Submit Success UX
- [x] File: `src/app/(dashboard)/links/link-form.tsx`
  - After creating a new link: toast "Link created" + redirect to `/links`
  - After editing a link: toast "Link updated" + stay on edit page (user may want to edit more)
- [x] File: `src/app/(dashboard)/campaigns/campaign-form.tsx`
  - After creating: toast + redirect to `/campaigns`
  - After editing: toast + redirect to `/campaigns`
- [x] File: `src/app/(dashboard)/settings/page.tsx`
  - Profile save: toast "Profile updated"
  - Password change: toast "Password changed"
  - Notification save: toast "Preferences saved"
- [x] All toasts use `sonner` (already installed) with `richColors`
- [x] Tests: unit (toast messages, redirect behavior)

### TASK 15.7 — Dashboard Analytics Empty State UX
- [x] File: `src/app/(dashboard)/analytics/page.tsx`
- [x] When user has 0 clicks: show useful empty state, not empty charts
- [x] Empty state message: "No click data yet. Share your links to start seeing analytics."
- [x] Add "Copy a link" button that goes to `/links`
- [x] Tests: unit (empty state rendering)

### TASK 15.8 — Confirm Before Delete (All Delete Actions)
- [x] File: `src/app/(dashboard)/links/page.tsx` — delete link action
- [x] File: `src/app/(dashboard)/campaigns/campaign-actions.tsx` — delete campaign
- [x] File: `src/app/(dashboard)/settings/api-keys-panel.tsx` — revoke API key
- [x] All delete actions must show a confirmation dialog (already using shadcn Dialog):
  - "Are you sure you want to delete [name]?"
  - "This action cannot be undone."
  - Cancel + Delete buttons
- [x] Verify: existing delete confirmations work, add where missing
- [x] Tests: unit (dialog renders, confirm/cancel callbacks)

### TASK 15.9 — Loading State for All Interactive Actions
- [x] Scan all forms across the app for missing loading states:
  - Buttons should show spinner + disable during submit
  - Use `isSubmitting` state pattern consistently
- [x] Check: login, register, verify, forgot-password, reset-password, create link, edit link, create campaign, edit campaign, settings save, upgrade button
- [x] All must have: `disabled={isSubmitting}` + `<Loader2 className="animate-spin" />` when submitting
- [x] Tests: unit (button disabled state during submit)

### TASK 15.10 — Mobile Navigation Polish
- [x] File: `src/components/dashboard/app-header.tsx`
  - Breadcrumbs on mobile: truncate to current page only (hide parent breadcrumbs)
- [x] File: `src/components/dashboard/app-sidebar.tsx`
  - Sidebar collapsed by default on mobile (`defaultOpen={false}` for mobile via media query or responsive prop)
- [x] File: `src/app/(dashboard)/links/page.tsx`
  - Links table: on mobile, hide some columns, show essential info only
- [x] File: `src/app/(dashboard)/settings/billing/page.tsx`
  - Billing plan cards: stack vertically on mobile
- [x] Tests: unit (responsive behavior verification where testable)

### TASK 15.11 — Form Validation UX Improvements
- [x] All forms: show inline field errors immediately on blur (not just on submit)
- [x] All forms: clear field error when user starts typing in that field
- [x] Highlight invalid fields with red border (`aria-invalid` attribute)
- [x] File specific checks:
  - Link form: validate URL format with helpful message
  - Campaign form: validate slug format
  - Auth forms: password strength indicator ("Weak / Fair / Strong")
- [x] Tests: unit (validation error display, field-level clearing)

### TASK 15.12 — End-to-End Tests for Critical Flows
- [x] E2E: auth flow (register → verify → login → dashboard → logout)
- [x] E2E: link flow (create link → visit short URL → check analytics)
- [x] E2E: campaign flow (create campaign → add link → delete campaign)
- [x] E2E: billing flow (visit billing → upgrade button → verify redirect)
- [x] E2E: settings flow (change profile → change password)
- [x] All E2E tests pass; update any that broke from Phase 15 changes
- [x] Run full test suite, typecheck, lint — all must pass

### TASK 15.13 — Apply PlanGate to ALL Gated Features
> **Principle:** Never show an error after the fact. Disable the control upfront with a clear reason and upgrade path.

- [x] Pass `userPlan` to `CreateLinkForm` from `NewLinkPage` and `EditLinkPage`
- [x] Apply `PlanGate` to custom slug input (FREE users)
- [x] Apply `PlanGate` to "Enable Link Page" toggle (FREE users)
- [x] Apply `PlanGate` to "Enable Smart Rules" toggle (FREE users)
- [x] Apply `PlanGate.Quota` to "Enable Link Page" toggle when quota exhausted (PRO/BUSINESS with quota)
- [x] Apply `PlanGate.Quota` to "Enable Smart Rules" toggle when quota exhausted
- [x] Apply `PlanGate.Quota` to "New Campaign" button on `/campaigns` page (when quota reached)
- [x] Apply `PlanGate` to "API Keys" tab content in Settings (FREE users already gated via upgrade prompt, but make input area use PlanGate for consistency)
- [x] Apply `PlanGate` to "API Docs" sidebar nav item (already hidden for FREE — verify it works)
- [x] Scan ALL pages for any remaining plan-gated features without proper UX gating
- [x] Tests: unit (each gated control renders correctly per plan), integration (full flow with FREE user hitting gates)

### TASK 15.14 — Pass userPlan Through Dashboard Hierarchy
- [x] `DashboardLayout` already has `billingUser.plan` — pass to `AppSidebar` (✅ done) and `AppHeader`
- [x] Create `src/lib/auth/plan-context.ts` — React Context for `UserPlan` (avoids prop drilling)
- [x] Wrap dashboard children in `PlanProvider` with `userPlan` value
- [x] All dashboard components read plan from context instead of props
- [x] Refactor existing components that take `plan` prop to use context
- [x] Tests: unit (context provides correct plan value)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 15.1 → 15.2 → 15.3 → 15.4 → 15.5 → 15.6 → 15.7 → 15.8 → 15.9 → 15.10 → 15.11 → 15.12 → 15.13 → 15.14

**Estimated total:** 85 + 14 = 99 tasks

---

## 🔴 Phase 16: Settings & Profile UX Hardening

> **Source:** Rafi + Claw Kun audit — 2026-05-07. Fix settings crash, implement 2FA, refresh profile UI, and harden settings against production edge cases.

### TASK 16.1 — Fix Settings Page Crash (Something Went Wrong)
- [x] File: `src/app/(dashboard)/settings/page.tsx`
- [x] Wrap DB queries in try/catch — if `findSettingsUserById` throws, show inline error state
- [x] Handle null `notifications` JSON column gracefully (default to `{}`)
- [x] File: `src/lib/db/queries/settings.ts` — return safe fallback if column is null
- [x] Run `rtk bun run db:push` to sync schema
- [x] Tests: unit (null handling), integration (settings renders with error recovery)

### TASK 16.2 — Implement 2FA (TOTP)
- [x] Add `otpauth`: `rtk bun add otpauth`
- [x] Add DB columns: `twoFactorSecret` (text), `twoFactorEnabled` (boolean)
- [x] `rtk bun run db:push`
- [x] Create `src/lib/auth/two-factor.ts` — generate TOTP secret, verify token, generate backup codes (8 codes, SHA256 stored)
- [x] Create `src/app/api/v1/auth/2fa/setup/route.ts` — POST: return QR code otpauth:// URL
- [x] Create `src/app/api/v1/auth/2fa/verify/route.ts` — POST: verify setup token, enable 2FA, return backup codes
- [x] Create `src/app/api/v1/auth/2fa/disable/route.ts` — POST: require password, disable 2FA
- [x] Update login flow: after password valid, if `twoFactorEnabled` → show 2FA step
- [x] Create `src/app/(marketing)/2fa/page.tsx` — OTP input + backup code link
- [x] File: settings page — replace dead "Enable 2FA" button with real modal/flow:
  ```
  ┌───────────────────────────────────────┐
  │ Two-Factor Authentication            │
  │                                       │
  │ [Disabled]:  [Enable 2FA]             │
  │   → opens modal with QR code + verify │
  │                                       │
  │ [Enabled]:   🟢 2FA Active            │
  │   [Disable 2FA]  [Regenerate codes]   │
  └───────────────────────────────────────┘
  ```
- [x] Backup codes shown once after setup; regenerate invalidates old codes
- [x] Tests: unit (TOTP verify, backup codes), integration (2FA setup + login)

### TASK 16.3 — Refresh Profile Across Dashboard After Save
- [x] After saving profile name, sidebar still shows old name until page refresh
- [x] File: `src/app/(dashboard)/settings/settings-forms.tsx`
- [x] After successful profile save → call `router.refresh()` to reload server components
- [x] Ensure plan badge also refreshes after billing upgrade
- [x] Tests: integration (profile save → sidebar updates)

### TASK 16.4 — Password Change UX
- [x] File: `src/app/(dashboard)/settings/settings-forms.tsx`
- [x] Add show/hide toggle on password fields (eye icon)
- [x] After success: show confirmation + "Sign out other devices" option
- [x] Delay form clear so user can read success message
- [x] Tests: unit (password toggle, success UX)

### TASK 16.5 — Notification Persistence
- [x] Verify `notifications` JSON column loads correctly from DB
- [x] After save, update local state immediately (no page reload needed)
- [x] Tests: integration (save → reload → preferences intact)

### TASK 16.6 — Change Email Flow
- [x] Create `src/app/api/v1/auth/change-email/route.ts` — POST: require password, send OTP to new email
- [x] Create `src/app/api/v1/auth/verify-new-email/route.ts` — POST: verify OTP, update email
- [x] Settings Profile tab: "Change Email" expandable section → password + new email + OTP
- [x] Tests: integration (change email full flow)

### TASK 16.7 — Delete Account
- [x] Create `src/app/api/v1/auth/delete-account/route.ts` — POST: require password, soft-delete user + cascade
- [x] Add `deletedAt` to users table
- [x] Settings Security tab bottom: red warning card + "Delete My Account" → confirm dialog → password → final
- [x] After delete: sign out all sessions, redirect to landing
- [x] Tests: integration (delete account → login rejected)

### TASK 16.8 — Logout Loading State
- [x] File: `src/components/dashboard/app-sidebar.tsx`
- [x] Show spinner in dropdown during sign out, disable menu
- [x] Tests: unit (loading state during sign out)

### TASK 16.9 — Fix Upgrade Card Copy
- [x] Current: "Unlock Link Pages, Smart Rules, and unlimited links" — inaccurate (FREE has these already)
- [x] Update: "Unlock 500 links, 50 Link Pages, 10 campaigns, A/B testing, and API access"
- [x] Tests: unit (card copy)

### TASK 16.10 — Help / Support Page
- [x] Create `src/app/(dashboard)/help/page.tsx` — FAQ + contact
- [x] Add "Help" to sidebar Account nav with `HelpCircle` icon
- [x] Tests: unit (page renders)

### TASK 16.11 — Session Timeout Warning
- [x] Create `src/components/dashboard/session-timeout.tsx`
- [x] Monitor JWT expiry, warn at 5min remaining
- [x] "Extend Session" + "Sign Out" buttons
- [x] Include in dashboard layout
- [x] Tests: unit (timeout logic)

### TASK 16.12 — Production DB Migration Check
- [x] Verify all new columns/tables pushed to production: notifications, resetTokens, apiKeys, twoFactorSecret, twoFactorEnabled, deletedAt
- [x] Create verification script or run `rtk bun run db:push` in production
- [x] Tests: integration (schema verification)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 16.1 → 16.2 → 16.3 → 16.4 → 16.5 → 16.6 → 16.7 → 16.8 → 16.9 → 16.10 → 16.11 → 16.12

**Estimated total:** 99 + 12 = 111 tasks
**Estimated timeline:** 12 weeks (3 months) for 1 full-time developer

---

## 🔴 Phase 17: Pre-Launch Security & Resilience Hardening

> **Source:** Claw Kun comprehensive audit — 2026-05-08. Close the 3 HIGH and remaining MEDIUM gaps before go-live. Defense-in-depth hardening for the most critical paths.

### 🔴 HIGH — Must Fix Before Go-Live

### TASK 17.1 — Rate Limit the Public Redirect Handler
- [x] File: `src/app/[slug]/page.tsx` (and `src/app/[slug]/go/route.ts`)
- [x] Add Redis sliding window rate limit on the redirect path — most critical surface for a URL shortener
- [x] Rate limit: 100 requests per 60 seconds per IP for `/[slug]`
- [x] Rate limit: 30 requests per 60 seconds per IP for `/[slug]/go` (CTA clicks)
- [x] Use existing `slidingWindowRateLimit()` from `src/lib/redis/rate-limit.ts`
- [x] Key format: `redirect:slug:{ip}` and `redirect:cta:{ip}`
- [x] When rate-limited: return 429 with `Retry-After` header instead of redirect
- [x] Skip rate limit for known bot UAs (Googlebot, etc.) to avoid SEO impact
- [x] Tests: unit (rate limit triggers at threshold), integration (rate-limited request gets 429)

### TASK 17.2 — Replace CSP `unsafe-inline` with Nonce-Based Policy
- [x] File: `src/lib/security/headers.ts`
- [x] Remove `'unsafe-inline'` from both `script-src` and `style-src`
- [x] Generate per-request nonce via `crypto.randomUUID()`
- [x] Inject nonce via `next.config.ts` headers function using `request`-scoped nonce`
- [x] For scripts: migrate any inline `<script>` tags to external files or `next/script` with nonce
- [x] For styles: use CSS modules or styled-jsx instead of inline styles
- [x] Verify CSP doesn't break production — run full smoke test suite
- [x] Reference: [Next.js CSP docs](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [x] Tests: unit (CSP header contains nonce, no unsafe-inline)

### TASK 17.3 — Mitigate `after()` Experimental API Risk for Click Logging
- [x] Files: `src/app/[slug]/page.tsx` and `src/app/[slug]/go/route.ts`
- [x] Current: click logging uses `after(() => { void logRedirectClick(input) })` — experimental Next.js 16 API
- [x] Risk: if `after()` silently fails, ALL click events are lost
- [x] Option A (preferred): Replace with Upstash Redis queue — push click event to Redis list, process via cron/worker
- [x] Option B: Add try/catch inside `after()` + structured error telemetry to detect failures (superseded by queue fallback + structured failure logs)
- [x] Option C: Use `waitUntil()` from Vercel Edge if deployed there (evaluated; not needed with Node.js Redis queue + cron processor)
- [x] Add Sentry/OpenTelemetry alert when click logging fails > 5% of requests (implemented as log-based threshold telemetry; no Sentry SDK configured)
- [x] Tests: unit (click event enqueued to Redis), integration (event persistence verified)

### 🟡 MEDIUM — Should Fix Within Week 1

### TASK 17.4 — Standardize Error Logging (console.error → logger)
- [x] Scan all `src/app/api/v1/**/*.ts` route handlers
- [x] Replace bare `console.error("[ROUTE] message", error)` with `logger.error("api_error_response", { requestId, code, error })`
- [x] 50+ route handlers affected — bulk search & replace
- [x] Also audit `src/components/` and `src/lib/` for bare console logging
- [x] Verify JSON-structured logs appear correctly in production (Vercel Logs / Datadog / Grafana)
- [x] Tests: unit (logger output format)

### TASK 17.5 — Extract Duplicated `getRedirectLink()` and `getBaseUrl()`
- [x] Create `src/lib/links/redirect-cache.ts` — extract shared `getRedirectLink()` with cache logic
- [x] Refactor `src/app/[slug]/page.tsx` to import from shared module
- [x] Refactor `src/app/[slug]/go/route.ts` to import from shared module
- [x] Create `src/lib/api/base-url.ts` — extract `getBaseUrl()` used in 4+ route files
- [x] Refactor all route handlers to use shared `getBaseUrl()`
- [x] Verify zero behavioral changes — all existing tests must pass
- [x] Tests: update imports, run full suite

### TASK 17.6 — Decouple Click Count from Redirect Cache
- [x] Current: `redirect:${slug}` cache includes `clickCount` — stale for up to 300s
- [x] File: `src/lib/links/redirect.ts` — remove `clickCount` from `RedirectLink` cache entry
- [x] Store `clickCount` separately — either Redis atomic `INCR` or periodic DB flush
- [x] Dashboard queries pull real-time-ish click count (Redis first, DB fallback)
- [x] Cache TTL for redirect metadata stays 300s; click count refreshes every 60s
- [x] Tests: unit (separate cache keys), integration (click count freshness)

### TASK 17.7 — Add Cursor-Based Pagination for List Endpoints
- [x] Files: `GET /api/v1/links`, `GET /api/v1/campaigns`, `GET /api/v1/pages`
- [x] Add optional `cursor` param (uses `createdAt` + `id` as cursor)
- [x] Add `maxPageLimit` (e.g., 100 items max per request)
- [x] Keep backward compatibility with `page` + `limit` params
- [x] Return `nextCursor` in response for cursor-based navigation
- [x] Tests: integration (cursor pagination returns correct next page)

### TASK 17.8 — Add `global-error.tsx` Root Error Boundary
- [x] ✅ Already created by Claw Kun (see `src/app/global-error.tsx`)

### 🟢 LOW — Polish Items

### TASK 17.9 — Add DB Proxy Symbol Trap Handlers
- [x] File: `src/lib/db/index.ts`
- [x] Add `Symbol.toPrimitive` and `Symbol.iterator` handlers to the Proxy
- [x] Prevents runtime errors if any tool/library tries to iterate or coerce `db`
- [x] Tests: unit (proxy symbol behavior)

### TASK 17.10 — Validate Destination URL Protocols
- [x] File: `src/lib/validations/link.ts` — `createLinkSchema`
- [x] Add URL protocol validation: reject `javascript:`, `data:`, `file:`, `vbscript:`
- [x] Only allow `http:` and `https:` protocols
- [x] Return clear error: "URL must start with http:// or https://"
- [x] Tests: unit (reject dangerous protocols)

### TASK 17.11 — Cache Subscription Status in Dashboard Layout
- [x] File: `src/app/(dashboard)/layout.tsx`
- [x] `syncSubscriptionStatusForUser()` runs on every dashboard page navigation — adds DB load
- [x] Cache subscription snapshot in Redis with 60s TTL
- [x] Only query DB on cache miss
- [x] Tests: unit (cache hit returns correct plan)

### TASK 17.12 — Add Settings Loading Skeleton
- [x] ✅ Already created by Claw Kun (see `src/app/(dashboard)/settings/loading.tsx`)

### TASK 17.13 — Add Settings Error Boundary
- [x] ✅ Already created by Claw Kun (see `src/app/(dashboard)/settings/error.tsx`)

### TASK 17.14 — Add Dashboard Layout Error Recovery
- [x] ✅ Already fixed by Claw Kun — try/catch around `syncSubscriptionStatusForUser` and `findBillingUserById`

### TASK 17.15 — Add Playwright E2E Tests for Critical Flows
- [x] File: `tests/e2e/auth.spec.ts` — register → verify → login → dashboard → logout
- [x] File: `tests/e2e/link-flow.spec.ts` — create link → visit short URL → verify analytics
- [x] File: `tests/e2e/payment-flow.spec.ts` — visit billing → click upgrade → verify Midtrans redirect
- [x] File: `tests/e2e/settings-flow.spec.ts` — change profile → change password → verify persistence
- [x] Run: `rtk bun run test:e2e` — all 4 specs must pass
- [x] Add to CI pipeline (after build step, optional for PR)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order (GO-LIVE BLOCKERS first):**
17.1 → 17.2 → 17.3 → 17.4 → 17.5 → 17.6 → 17.7 → 17.9 → 17.10 → 17.11 → 17.15

(17.8, 17.12, 17.13, 17.14 already completed by Claw Kun)

**Estimated total:** 111 + 15 = 126 tasks
**Estimated timeline:** 1 week for go-live blockers (17.1–17.3), 1 week for MEDIUM items (17.4–17.8), 1 week for polish (17.9–17.15)

**🔴 BLOCKERS for go-live:** 17.1, 17.2, 17.3 — must be done before production launch.

---

## 👑 Phase 18: Superadmin — Platform Control Center

> **Source:** Rafi — 2026-05-08. Grant `iqooz9xmg@gmail.com` highest-privilege access. Full user management, system analytics, and audit trail. Superadmin overrides all plan gates — every feature, every endpoint, no quota limits.

> **🔒 SECURITY MANDATE:** This is the most sensitive phase in the entire project. Superadmin actions MUST be audited. Superadmin routes MUST have stricter rate limits + shorter session timeouts. Zero shortcuts on authorization checks.

### 🔴 CRITICAL — Design Principles (Read Before Coding)

1. **Set-once via DB only** — superadmin role is NOT assignable through any API. It's set via migration/seed on a known email hash. No self-escalation vector.
2. **Audit everything** — every superadmin action (user plan change, user suspension, system config) writes to an append-only audit log table.
3. **Plan bypass, not plan change** — superadmin keeps their plan in DB, but auth middleware overrides feature gates to `BUSINESS+` equivalent. Don't mutate `users.plan`.
4. **Short session for admin pages** — superadmin dashboard uses stricter JWT validation (re-verify role on each admin request, not just at login).
5. **No delete, only suspend** — superadmin cannot hard-delete users. Only soft-delete/suspend. Keeps data integrity.
6. **Rate limit: 30 req/min for admin routes** — tighter than normal API routes (which are 30–120/min depending on plan).

### 🏗️ Architecture Overview

```
src/
├── lib/
│   ├── auth/
│   │   ├── superadmin.ts          # isSuperAdmin(), requireSuperAdmin()
│   │   └── session-token.ts       # [MODIFIED] propagate role to JWT
│   ├── db/
│   │   ├── schema.ts              # [MODIFIED] adminAuditLog table
│   │   └── queries/
│   │       ├── admin.ts           # listUsers, getUserDetail, updateUserPlan, suspendUser
│   │       └── admin-audit.ts     # insertAuditLog, listAuditLogs
│   ├── admin/
│   │   ├── guard.ts               # Superadmin route middleware
│   │   └── audit.ts               # Audit log helpers
│   └── validations/
│       └── admin.ts               # Admin action schemas
├── app/
│   ├── api/v1/admin/
│   │   ├── users/route.ts         # GET list, PATCH bulk
│   │   ├── users/[id]/route.ts    # GET detail, PATCH plan, POST suspend
│   │   ├── analytics/route.ts     # GET system-wide stats
│   │   └── audit-log/route.ts     # GET audit trail
│   └── (dashboard)/
│       └── admin/
│           ├── page.tsx            # Admin dashboard
│           ├── users/page.tsx      # User management table
│           ├── users/[id]/page.tsx # User detail + plan override
│           ├── analytics/page.tsx  # System analytics
│           └── audit-log/page.tsx  # Audit trail viewer
└── components/
    └── admin/
        ├── admin-nav.tsx          # Admin sidebar section
        ├── user-table.tsx         # Searchable user table
        ├── plan-override-dialog.tsx
        └── audit-log-table.tsx
```

---

### TASK 18.1 — Database: Superadmin Role + Audit Log Table
- [ ] Add `ADMIN_AUDIT_LOG_TABLE` constant comment to keep schema organized
- [ ] Add `adminAuditLog` table to `src/lib/db/schema.ts`:
  ```typescript
  export const adminAuditLog = pgTable(
    "admin_audit_log",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      adminUserId: uuid("admin_user_id")
        .references(() => users.id, { onDelete: "set null" })
        .notNull(),
      action: varchar("action", { length: 50 }).notNull(),
      // action values: "user.plan.change", "user.suspend", "user.unsuspend",
      //               "system.config", "admin.login"
      targetUserId: uuid("target_user_id")
        .references(() => users.id, { onDelete: "set null" }),
      metadata: jsonb("metadata").$type<Record<string, unknown>>(),
      ipAddress: varchar("ip_address", { length: 45 }),
      createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => ({
      adminUserIdIdx: index("audit_admin_user_idx").on(table.adminUserId),
      actionIdx: index("audit_action_idx").on(table.action),
      createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
    }),
  );
  ```
- [ ] Add `SUPERADMIN_ROLE = "superadmin"` constant to `src/lib/db/schema.ts`
- [ ] Run `rtk bun run db:push`
- [ ] Tests: unit (audit log table columns, indexes exist)

### TASK 18.2 — Auth: Propagate Role to JWT + Superadmin Guards
- [ ] File: `src/lib/auth/session-token.ts`
  - Add `role` to JWT on login: query `users.role` and set `token.role`
  - Add `role` to session from JWT: `session.user.role = token.role`
- [ ] File: `src/lib/auth/superadmin.ts` (NEW)
  ```typescript
  export const SUPERADMIN_ROLE = "superadmin";
  
  export function isSuperAdmin(role: string | null | undefined): boolean {
    return role === SUPERADMIN_ROLE;
  }
  
  export async function requireSuperAdmin(): Promise<string> {
    const session = await auth();
    const userId = typeof session?.user?.id === "string" ? session.user.id : null;
    const role = (session?.user as { role?: string } | undefined)?.role;
    
    if (!userId || !isSuperAdmin(role)) {
      throw new Error("Superadmin access required.");
    }
    return userId;
  }
  ```
- [ ] File: `src/lib/links/limits.ts` — add plan bypass:
  ```typescript
  export function resolveEffectivePlan(plan: UserPlan, role?: string | null): UserPlan {
    if (isSuperAdmin(role)) return "BUSINESS";
    return plan;
  }
  ```
  Update all quota functions to accept optional `role` param and call `resolveEffectivePlan`.
- [ ] Tests: unit (JWT role propagation), unit (isSuperAdmin), unit (plan bypass)

### TASK 18.3 — Seed: Promote iqooz9xmg@gmail.com to Superadmin
- [ ] File: `scripts/seed-superadmin.ts` (NEW)
  - Accept `--email=` CLI arg (default: `iqooz9xmg@gmail.com`)
  - Query user by email, update `role = 'superadmin'`
  - Idempotent — safe to run multiple times
  - Log result: "User {email} is now superadmin" or "User {email} already superadmin"
  - Exit code 1 if user not found (with clear error message)
- [ ] Add npm script: `"seed:superadmin": "bun run scripts/seed-superadmin.ts"`
- [ ] Document in `_bmad-output/planning-artifacts/` — create `SUPERADMIN.md` with setup instructions
- [ ] Tests: unit (seed script logic, idempotency)
- [ ] **Run the script** — promote `iqooz9xmg@gmail.com`

### TASK 18.4 — Admin API: User Management Endpoints
- [ ] File: `src/lib/db/queries/admin.ts` (NEW)
  - `listAllUsers({ limit, page, search, plan?, status? })` — returns paginated user list with plan, status, link count, created date
  - `getUserDetailById(id)` — full user record minus password hash
  - `updateUserPlan({ userId, plan, adminUserId })` — change plan, log to audit
  - `suspendUser({ userId, adminUserId })` — soft delete (set `deletedAt`)
  - `unsuspendUser({ userId, adminUserId })` — clear `deletedAt`
  - `getSystemStats()` — total users, total links, total clicks, total revenue (sum transactions)
- [ ] File: `src/lib/validations/admin.ts` (NEW)
  - `adminUpdateUserPlanSchema` — Zod: plan must be one of FREE/PRO/BUSINESS
  - `adminUserListQuerySchema` — Zod: page, limit, search, plan filter
- [ ] File: `src/lib/admin/guard.ts` (NEW)
  - `adminRouteGuard()` — wrapper for API routes: verifies superadmin role, logs action to audit
  - Returns 403 with structured error if not superadmin
  - Returns 401 if not authenticated at all
- [ ] File: `src/app/api/v1/admin/users/route.ts` (NEW)
  - GET: list all users (paginated, searchable, filterable by plan)
  - Requires superadmin auth
- [ ] File: `src/app/api/v1/admin/users/[id]/route.ts` (NEW)
  - GET: user detail (profile, plan, link count, subscription status, recent activity)
  - PATCH: change user plan (body: `{ plan: "PRO" | "BUSINESS" | "FREE" }`)
  - POST: suspend user (body: `{ action: "suspend" | "unsuspend" }`)
  - All actions write to audit log
- [ ] File: `src/app/api/v1/admin/analytics/route.ts` (NEW)
  - GET: system-wide stats (total users, total links, total clicks, revenue, top plans distribution)
- [ ] File: `src/app/api/v1/admin/audit-log/route.ts` (NEW)
  - GET: paginated audit log entries, filterable by action type
- [ ] Rate limit: 30 req/min for all `/api/v1/admin/*` routes
- [ ] Tests: integration (list users, get user detail, change plan, suspend, unsuspend, system stats, audit log)

### TASK 18.5 — Admin Frontend: Sidebar + Dashboard Pages
- [ ] File: `src/components/dashboard/app-sidebar.tsx`
  - Add "Admin" nav section (only visible when `role === "superadmin"`):
    - "Admin Dashboard" → `/admin` with `Shield` icon
    - Separator line between Account and Admin sections
  - Use `usePlan()` or session to check `role`
- [ ] File: `src/app/(dashboard)/admin/page.tsx` (NEW)
  - Admin overview: cards for total users, total links, total clicks, MRR estimate
  - Quick actions: "Manage Users", "View Audit Log"
  - Recent audit log entries (last 10)
- [ ] File: `src/app/(dashboard)/admin/users/page.tsx` (NEW)
  - Searchable, filterable user table
  - Columns: email, name, plan badge, links count, status (active/suspended), joined date
  - Click row → user detail page
- [ ] File: `src/app/(dashboard)/admin/users/[id]/page.tsx` (NEW)
  - User profile card (email, name, avatar, join date)
  - Plan section: current plan badge + "Change Plan" dropdown (FREE/PRO/BUSINESS)
  - Stats: total links, total clicks, subscription status
  - Danger zone: "Suspend User" / "Unsuspend User" button with confirmation dialog
- [ ] File: `src/app/(dashboard)/admin/analytics/page.tsx` (NEW)
  - System-wide charts: users over time, links created, clicks, revenue
  - Plan distribution pie chart
  - Top users by link count
- [ ] File: `src/app/(dashboard)/admin/audit-log/page.tsx` (NEW)
  - Filterable audit log table
  - Columns: timestamp, admin, action (with badge color), target user, metadata
  - Filter by action type
- [ ] All admin pages: loading skeletons, empty states, error boundaries
- [ ] Tests: unit (admin nav visibility), integration (admin pages load with data)

### TASK 18.6 — Plan Bypass: Superadmin Sees Everything
- [ ] File: `src/lib/auth/plan-context.ts`
  - Accept optional `role` prop alongside `userPlan`
  - Resolve effective plan via `resolveEffectivePlan(plan, role)`
- [ ] File: `src/app/(dashboard)/layout.tsx`
  - Pass `role` from session to `PlanProvider`
- [ ] File: `src/lib/links/limits.ts`
  - Update all functions: `getLinkQuota(plan, role?)`, `getApiEndpointRateLimit(plan, role?)`, etc.
  - Each calls `resolveEffectivePlan(plan, role)` internally
- [ ] Verify: superadmin sees all PRO/BUSINESS features (API docs, unlimited links, etc.) regardless of actual plan in DB
- [ ] Verify: plan badge in sidebar shows "Superadmin" instead of plan name for superadmin users
- [ ] Tests: unit (plan bypass for each quota function), integration (superadmin sees premium features)

### TASK 18.7 — Security: Stricter Admin Session + Rate Limiting
- [ ] File: `src/lib/admin/guard.ts`
  - Superadmin session re-validation: query DB for `role` on every admin API call (not just JWT trust)
  - If user was demoted (role changed since JWT issued), reject immediately
  - Return 403 with code `SUPERADMIN_REQUIRED`
- [ ] File: `src/lib/redis/rate-limit.ts` — no changes needed, reuse `slidingWindowRateLimit`
- [ ] File: `src/app/api/v1/admin/*` — all routes
  - Add `X-Admin-Action: true` response header for audit trail correlation
  - Rate limit key: `admin:api:{userId}` with 30 req/min window
- [ ] File: `src/proxy.ts`
  - Add admin route prefix to proxy matcher: `/api/v1/admin/:path*`
- [ ] Tests: integration (demoted superadmin gets 403), unit (rate limit enforced)

### TASK 18.8 — Audit Log: Write + Display
- [ ] File: `src/lib/admin/audit.ts` (NEW)
  ```typescript
  export async function writeAdminAuditLog({
    action,
    adminUserId,
    metadata,
    targetUserId,
  }: {
    action: string;
    adminUserId: string;
    metadata?: Record<string, unknown>;
    targetUserId?: string;
  }): Promise<void>
  ```
  - Fire-and-forget (don't block admin action on audit log failure)
  - Log to `adminAuditLog` table
- [ ] File: `src/lib/db/queries/admin-audit.ts` (NEW)
  - `insertAdminAuditLog(...)` — insert single entry
  - `listAdminAuditLogs({ limit, page, action? })` — paginated, filterable
- [ ] Wire audit logging into:
  - User plan change (18.4)
  - User suspend/unsuspend (18.4)
  - Any future admin actions
- [ ] Tests: unit (audit log write + read), integration (audit entries appear after admin action)

### TASK 18.9 — E2E: Superadmin Flow
- [ ] File: `tests/e2e/admin-flow.spec.ts` (NEW)
  - Login as superadmin → verify admin nav appears
  - Navigate to admin dashboard → verify stats cards render
  - Navigate to user management → search for a user → verify results
  - Click user → change plan → verify success toast + audit log entry
  - Suspend user → verify user shows as suspended
  - View audit log → verify entries appear
- [ ] Tests must pass: `rtk bun run test:e2e -- tests/e2e/admin-flow.spec.ts`

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)

# After DB changes:
rtk bun run db:push

# Promote superadmin:
rtk bun run seed:superadmin
```

**Priority order:** 18.1 → 18.2 → 18.3 → 18.4 → 18.5 → 18.6 → 18.7 → 18.8 → 18.9

**Estimated total:** 126 + 9 = 135 tasks
**Estimated timeline:** 2–3 days (this is a full feature, not a hardening pass)

**👑 SUPERADMIN EMAIL:** `iqooz9xmg@gmail.com`

**Critical security rules (Codex — do NOT violate):**
1. ❌ NEVER expose superadmin role in client-side-only checks — always verify server-side
2. ❌ NEVER allow role change through any API endpoint — seed script only
3. ❌ NEVER skip audit logging — every admin mutation MUST write to `adminAuditLog`
4. ❌ NEVER allow superadmin to delete users — suspend only
5. ❌ NEVER trust client-side role checks — re-verify on every admin API call

Good luck. Ship it. 👑🚀
