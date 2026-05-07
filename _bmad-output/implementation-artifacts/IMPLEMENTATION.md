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
- [x] Tables to verify: `users`, `links`, `link_pages`, `smart_rules`, `click_events`, `campaigns`, `split_tests`, `split_test_variants`, `subscriptions`, `transactions`, `settings`

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
- [x] POST: create/update split test `{ variants: [{ destinationUrl, weight }] }`
- [x] GET: get split test config + performance data
- [x] DELETE: remove split test
- [x] Auth: required, ownership check

### TASK 7.2 — Split Test Router
- [x] Integrate into redirect handler (`[slug]/page.tsx`)
- [x] If link has active split test:
  1. Calculate total weight
  2. Generate random number 0-totalWeight
  3. Select variant based on weight range
  4. Log which variant was selected
- [x] Increment `clickCount` on variant

### TASK 7.3 — Split Test Tests
- [x] Unit: variant selection algorithm
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
- [ ] Redis cache warming
- [x] Monitoring/alerting configured (baseline scheduled production smoke)
- [ ] Backup strategy verified
- [ ] Load test: 5000 concurrent redirects
- [ ] Penetration test (basic)
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
- [ ] Read `_bmad-output/planning-artifacts/SECURITY.md` completely
- [ ] Implement all 16 security categories (Access Control, Cryptography, Injection, XSS, CSRF, Misconfiguration, DDoS, N+1, Input Validation, SSRF, Auth Security, Payment Security, Data Protection, Dependencies, Logging, Infrastructure)
- [ ] Run security code audit commands (see SECURITY.md § Code-Level Verification)
- [ ] Fix all findings before marking complete
- [ ] Verify zero HIGH severity issues
- [ ] Document any accepted risks in JOURNAL.md

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
- [ ] File: `src/app/(dashboard)/analytics/page.tsx`
- [ ] Make page `async` server component
- [ ] Query real analytics from DB:
  - Daily click counts for last 7/30 days from `clickEvents`
  - Device breakdown (mobile/desktop/tablet) from `clickEvents.userAgent`
  - Top referrers from `clickEvents.referrer`
  - Top countries from `clickEvents.country`
- [ ] Add date range picker (last 7 days, 30 days, 90 days, custom)
- [ ] Add "Export CSV" button
- [ ] Replace ALL empty mock arrays with real data
- [ ] Add loading state (already has loading.tsx)
- [ ] Tests: unit (data aggregation), integration (analytics API queries)

### TASK 12.18 — Post-Payment Checkout Pages
- [ ] Create `src/app/(marketing)/checkout/success/page.tsx`
  - Accept `?order_id=` query param
  - Show success message with plan name, next billing date
  - "Go to Dashboard" CTA button
- [ ] Create `src/app/(marketing)/checkout/cancel/page.tsx`
  - Show "Payment was cancelled" message
  - "Try Again" link back to `/settings/billing`
- [ ] Update Midtrans Snap payload to include `redirect_url` finish/error/unfinish callbacks
- [ ] Tests: unit (checkout page renders), integration (payment flow end-to-end)

### TASK 12.19 — Individual Blog Post Pages
- [ ] Create `src/app/(marketing)/blog/[slug]/page.tsx`
- [ ] Read MDX file from `src/content/blog/[slug].mdx`
- [ ] Render MDX content with basic styling (headings, paragraphs, lists, code blocks)
- [ ] Add metadata: title, description, OpenGraph from frontmatter
- [ ] Add "Back to Blog" link at top
- [ ] Add loading state
- [ ] Wire up blog card links from `/blog` page (currently cards have no links)
- [ ] Tests: unit (MDX rendering), integration (blog post page)

### TASK 12.20 — Legal Pages
- [ ] Create `src/app/(marketing)/terms/page.tsx` — Terms of Service
- [ ] Create `src/app/(marketing)/privacy/page.tsx` — Privacy Policy
- [ ] Add footer links to Terms and Privacy on landing page and blog
- [ ] Add to sitemap
- [ ] Tests: unit (pages render correctly)

### TASK 12.21 — Midtrans Redirect URL Configuration
- [ ] File: `src/app/api/v1/payments/create/route.ts`
- [ ] Update `createMidtransSnapTransaction` payload to include `callbacks.finish` → `{APP_URL}/checkout/success?order_id={order_id}`
- [ ] Add `callbacks.error` and `callbacks.unfinish` URLs
- [ ] Ensure redirect URLs work with production domain
- [ ] Tests: verify Snap payload includes correct callback URLs

### TASK 12.22 — Search Implementation
- [ ] File: `src/components/dashboard/app-header.tsx`
- [ ] Wire search input to actually filter links by slug or destination
- [ ] Debounce input (300ms), redirect to `/links?search=query`
- [ ] Or: if keeping it simple, use GET param on links page directly
- [ ] Tests: unit (search query building)

---

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** 12.1 → 12.2 → 12.3 → 12.4 → 12.5 → 12.6 → 12.7 → 12.8 → 12.9 → 12.10 → 12.11 → 12.12 → 12.13 → 12.14 → 12.15 → 12.16 → 12.17 → 12.18 → 12.19 → 12.20 → 12.21 → 12.22

**Estimated total:** 54 tasks across 10 phases + 22 post-audit fixes
**Estimated timeline:** 12 weeks (3 months) for 1 full-time developer

Good luck. Ship it. 🚀
