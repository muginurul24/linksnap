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
- [x] Live slug preview: `linksnap.id/your-slug`
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
- Unit: rule evaluation for each type, device parsing
- Integration: create rules → visit with different IPs/UAs → verify correct redirect
- E2E: configure rules from dashboard → test with browser dev tools user agent override

---

## 🟠 Phase 5: QR Codes (3 tasks)

### TASK 5.1 — QR Generation API
- File: `src/app/api/v1/qr/[slug]/route.ts`
- No auth required (public endpoint)
- Generate QR code as PNG or SVG (query param `?format=png|svg`)
- Cache in Redis: `qr:{slug}:{format}` → base64 image
- TTL: 24 hours (or until link updated)
- Size: 300x300 default, configurable `?size=300`

### TASK 5.2 — QR Download
- Add download buttons in links table and QR codes page
- PNG download: `<a download="slug.png" href="/api/v1/qr/slug?format=png">`
- SVG download: `<a download="slug.svg" href="/api/v1/qr/slug?format=svg">`

### TASK 5.3 — QR Tests
- Integration: generate QR → verify it's valid → scan with phone → verify redirect
- E2E: click download button → verify file downloads

---

## 🔴 Phase 6: Campaign Workbench (5 tasks)

### TASK 6.1 — Campaign API
- File: `src/app/api/v1/campaigns/route.ts`
- POST: create campaign `{ name, slug, description, utmSource, utmMedium, utmCampaign, utmTerm, utmContent }`
- GET: list user campaigns (with link count)
- File: `src/app/api/v1/campaigns/[id]/route.ts`
- GET: campaign details
- PATCH: update campaign (utm templates, name)
- DELETE: delete campaign (links become ungrouped, not deleted)

### TASK 6.2 — Campaign Links API
- File: `src/app/api/v1/campaigns/[id]/links/route.ts`
- POST: add links to campaign `{ linkIds: [...] }`
- DELETE: remove link from campaign `{ linkId }`
- GET: list links in campaign (paginated)

### TASK 6.3 — Campaign Analytics API
- File: `src/app/api/v1/campaigns/[id]/analytics/route.ts`
- Return: aggregated analytics across all campaign links
- Total clicks, clicks per day, top links, top countries
- Compare campaigns: `?compare=ramadhan-2026,launch-q2-2026`

### TASK 6.4 — UTM Auto-Builder
- File: `src/lib/campaigns/utm-builder.ts`
- When adding link to campaign, auto-append UTM params to destination URL
- Format: `?utm_source=X&utm_medium=Y&utm_campaign=Z&utm_term=W&utm_content=V`
- Skip if destination URL already has UTM params
- Show preview before saving

### TASK 6.5 — Campaign Tests
- Unit: UTM builder, campaign analytics aggregation
- Integration: create campaign → add links → verify UTM params → check analytics
- E2E: full campaign workflow from dashboard

---

## ⚫ Phase 7: Split Testing (3 tasks)

### TASK 7.1 — Split Test API
- File: `src/app/api/v1/links/[id]/split-test/route.ts`
- POST: create/update split test `{ variants: [{ destinationUrl, weight }] }`
- GET: get split test config + performance data
- DELETE: remove split test
- Auth: required, ownership check

### TASK 7.2 — Split Test Router
- Integrate into redirect handler (`[slug]/page.tsx`)
- If link has active split test:
  1. Calculate total weight
  2. Generate random number 0-totalWeight
  3. Select variant based on weight range
  4. Log which variant was selected
- Increment `clickCount` on variant

### TASK 7.3 — Split Test Tests
- Unit: variant selection algorithm
- Integration: create split test → make 100 requests → verify distribution ≈ weights
- E2E: configure A/B test from dashboard

---

## 🟤 Phase 8: Payments (5 tasks)

### TASK 8.1 — Midtrans Integration
- File: `src/lib/payments/midtrans.ts`
- Initialize Midtrans Snap client
- Create transaction: `POST /api/v1/payments/create`
  - Input: `{ plan, duration }`
  - Calculate amount in IDR (USD price × `USD_IDR_RATE`)
  - Generate Snap token
  - Return: `{ snapToken, orderId }`

### TASK 8.2 — Payment Webhook
- File: `src/app/api/v1/payments/webhook/route.ts`
- Verify Midtrans signature (SHA512)
- Handle notification types: `settlement`, `cancel`, `deny`, `expire`, `pending`
- On settlement: create/upgrade subscription, update user plan
- Idempotent: check `orderId` before processing
- Send invoice email via Resend

### TASK 8.3 — Subscription Management
- File: `src/lib/payments/subscription.ts`
- Create subscription on successful payment
- Check subscription status on dashboard load
- Handle expiry: downgrade to Free plan
- Handle renewal cron job (Vercel Cron)

### TASK 8.4 — Billing Page (API + Frontend)
- File: `src/app/api/v1/payments/history/route.ts`
- Return user's transaction history (paginated)
- Dashboard billing page already created — connect to real data
- Show: current plan, billing history, next billing date, upgrade CTA

### TASK 8.5 — Payment Tests
- Unit: Midtrans signature verification, amount calculation
- Integration: create transaction → mock webhook → verify subscription created
- E2E: full payment flow (use Midtrans sandbox)

---

## 🟢 Phase 9: Public Site (4 tasks)

### TASK 9.1 — Landing Page
- File: `src/app/(marketing)/page.tsx`
- Sections: Hero, Features (6 cards), Pricing, Demo Generator, Testimonials
- Demo Generator: input URL → generate short link live (no auth)
- CTA: "Get Started Free" → `/register`, "Try Demo" → scroll to demo
- SEO: meta tags, OG image, structured data

### TASK 9.2 — Pricing Page
- File: `src/app/(marketing)/pricing/page.tsx`
- Monthly/annual toggle
- 3 plan cards: Free, Pro, Business
- Feature comparison table
- FAQ section

### TASK 9.3 — Blog
- File: `src/app/(marketing)/blog/page.tsx`
- List articles from MDX content
- Each article: `src/content/blog/{slug}.mdx`
- Minimum 3 articles for launch:
  1. "Why Your Short Links Are Costing You Conversions"
  2. "Smart Redirect Rules: The Marketing Hack Nobody Uses"
  3. "How Link Pages 5x'd Our Click-Through Rate"

### TASK 9.4 — Public Site Tests
- Lighthouse: target 90+ on all public pages
- E2E: landing → pricing → demo generator → register
- A11y: WCAG 2.1 AA audit

---

## 🔵 Phase 10: Polish & Launch (5 tasks)

### TASK 10.1 — Error Handling & Logging
- Global error boundary (app/error.tsx)
- Global not-found page (app/not-found.tsx)
- API error standardization: `{ success: false, error: { code, message, requestId } }`
- Structured logging with requestId

### TASK 10.2 — Loading States
- Dashboard skeleton (matching layout grid)
- Table skeleton (rows × columns)
- Chart skeleton (placeholder area chart)
- Button loading spinners
- Suspense boundaries on all async pages

### TASK 10.3 — SEO & Metadata
- `generateMetadata()` on all public pages
- Sitemap generation (`sitemap.ts`)
- Robots.txt (`robots.ts`)
- JSON-LD structured data (Organization, WebApplication)

### TASK 10.4 — Security Audit
- OWASP Top 10 checklist
- SQL injection: verify all queries use Drizzle parameterized
- XSS: verify all user content is sanitized
- CSRF: verify state-changing requests have token
- Rate limiting: verify all public endpoints are rate-limited
- Security headers: CSP, HSTS, X-Frame-Options, etc.

### TASK 10.5 — Launch Checklist
- [ ] Production environment variables set
- [ ] Custom domain configured (linksnap.id or similar)
- [ ] SSL certificate active
- [ ] Database indexes verified
- [ ] Redis cache warming
- [ ] Monitoring/alerting configured
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

    return NextResponse.json({ success: true, data: { ...link, shortUrl: `https://linksnap.id/${slug}` } }, { status: 201 });
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

## 🚀 Ready to Start?

```bash
cd ~/projects/linksnap
rtk bun run dev          # Start development
rtk bun run db:studio    # Open Drizzle Studio (in another terminal)
```

**Priority order:** Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 8 → Phase 4 → Phase 6 → Phase 7 → Phase 9 → Phase 10

**Estimated total:** 54 tasks across 10 phases
**Estimated timeline:** 12 weeks (3 months) for 1 full-time developer

Good luck. Ship it. 🚀
