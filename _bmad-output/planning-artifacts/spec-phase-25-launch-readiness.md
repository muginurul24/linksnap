# Phase 25: Launch Readiness — Production-Grade Final Polish

> **Status:** Approved by Rafi — 2026-05-09. This is the FINAL phase.
> **Goal:** Every remaining checkbox, every rough edge, every security concern — addressed. LinkSnap ships production-grade, nothing half-baked.

---

## Why This Phase Exists

Codex telah menyelesaikan 3 phase (22, 23, 24) dalam satu hari — 26 task, 766 tests, 15 payment channels, full dashboard UX. Sekarang saatnya finishing: semua yang tersisa harus dibereskan. Tidak ada "nanti aja".

**Remaining items:** 40 unchecked boxes mencakup production deployment, security hardening, accessibility, Flutter build, performance audit, load testing, dan documentation.

---

## 🔴 Phase Rules

- [ ] This is the FINAL implementation phase. Leave nothing unchecked.
- [ ] One commit per logical group (not necessarily per tiny change).
- [ ] Every commit must pass: typecheck + lint + unit tests + targeted E2E + build.
- [ ] Production safety first: never break existing functionality.
- [ ] Document decisions — future Rafi needs to understand why choices were made.
- [ ] If something CANNOT be done (e.g., needs external service), document clearly with rationale.

---

## 📋 Tasks

### 🟡 TASK 25.1 — Production Environment & Deployment

**Purpose:** Ensure production is configured correctly and deployable.

- [ ] Verify all `.env.example` vars are documented with descriptions
- [ ] Add `.env.production` checklist section to README or DEPLOY.md
- [ ] Verify Vercel project settings:
  - Environment variables set
  - Custom domain configured
  - Cron jobs active (click queue + subscription renewal)
- [ ] Verify `CRON_SECRET` is set in Vercel production
- [ ] Verify `NEXTAUTH_URL` points to production domain
- [ ] Verify Google OAuth callback URL matches production
- [ ] Verify Midtrans/PayGate webhook URL is production
- [ ] Verify Upstash Redis is production tier (not free tier with limits)
- [ ] Create `scripts/verify-production-env.sh` — checks all required env vars
- [ ] Production build: `rtk bun run build` must succeed with production env

**Files:**
- `.env.example` — Audit and update
- `DEPLOY.md` — New (deployment guide)
- `scripts/verify-production-env.sh` — New

---

### 🟡 TASK 25.2 — Security Final Audit

**Purpose:** Close the remaining security checklist. Every SECURITY.md category addressed.

- [ ] Audit all 16 SECURITY.md categories:
  - [x] Access Control (already done)
  - [x] Injection (SQL injection scan already clean)
  - [x] XSS (CSP headers already set)
  - [x] CSRF (X-Requested-With header enforced)
  - [ ] Misconfiguration — Verify no debug endpoints in production, no verbose errors
  - [x] DDoS (rate limiting already applied)
  - [x] N+1 (scan already clean)
  - [x] Input Validation (Zod on all routes)
  - [ ] SSRF — Verify no user-controlled URLs in server-side fetch
  - [x] Auth Security (NextAuth v5 JWT + httpOnly)
  - [x] Payment Security (PayGate webhook signature verified)
  - [x] Data Protection (IP hashing, no PII in logs)
  - [ ] Dependencies — Run `bun audit` or manual check for known CVEs
  - [x] Logging (structured logs with requestId, no secrets)
  - [ ] Infrastructure — Document TLS, database encryption, backup strategy
- [ ] Run SSRF scan: search for `fetch(`, `http.request(` with user-controlled input
- [ ] Verify no `console.log` in production code (only structured logger)
- [ ] Verify no `.env` committed to git (check git history)
- [ ] Verify CSP headers allow all legitimate resources without unsafe-inline/unsafe-eval
- [ ] Document security posture in SECURITY.md

**Files:**
- `_bmad-output/planning-artifacts/SECURITY.md` — Update all categories
- `_bmad-output/planning-artifacts/security-audit-2026-05-09.md` — New (final audit)

---

### 🟡 TASK 25.3 — Accessibility & Lighthouse

**Purpose:** Achieve Lighthouse score ≥ 95. Screen reader and keyboard navigation.

- [ ] Run Lighthouse audit on key pages:
  - `/` (landing)
  - `/dashboard`
  - `/links`
  - `/campaigns`
  - `/analytics`
- [ ] Fix any accessibility violations:
  - [ ] `aria-label` on all icon-only buttons
  - [ ] Keyboard navigation: Tab order logical, focus visible
  - [ ] Heading hierarchy: h1→h2→h3, no skips
  - [ ] Landmarks: nav, main, aside properly used
  - [ ] Color contrast: text meets WCAG AA (4.5:1)
  - [ ] Form labels: all inputs have associated labels
- [ ] Fix any performance issues:
  - Image optimization (Next.js Image component where applicable)
  - Bundle size audit (no accidental heavy imports)
  - Font loading strategy
- [ ] Fix any SEO issues:
  - Meta descriptions on all public pages
  - Open Graph tags
  - Sitemap (if applicable)
  - robots.txt
- [ ] Target: Lighthouse score ≥ 95 on all key pages

**Files:**
- Multiple — accessibility fixes across components
- `public/robots.txt` — Verify exists
- `src/app/sitemap.ts` — Verify exists

---

### 🟡 TASK 25.4 — Error Tracking & Observability

**Purpose:** Production needs error visibility. Set up monitoring.

- [ ] Verify structured logger is used consistently across all catch blocks
- [ ] Add `requestId` to all API error responses (audit existing)
- [ ] Create `src/lib/observability/health.ts` — Health check endpoint
- [ ] Add `GET /api/v1/health` — Returns DB status, Redis status, uptime
- [ ] Add error rate tracking (basic counter in Redis)
- [ ] Add critical path instrumentation:
  - Redirect latency logging
  - Payment creation timing
  - Click queue processing metrics
- [ ] Document monitoring setup (future: Sentry, Logtail, or Vercel Analytics)

**Files:**
- `src/lib/observability/health.ts` — New
- `src/app/api/v1/health/route.ts` — New
- `src/lib/observability/instrumentation.ts` — New

---

### 🟡 TASK 25.5 — Load Testing & Performance Baseline

**Purpose:** Verify LinkSnap handles production traffic. Know the limits.

- [ ] Create `scripts/load-test-redirect.sh` — Artillery/k6 script for redirect load
- [ ] Test: 5000 concurrent redirects, p50 < 5ms (Redis hit), p99 < 500ms
- [ ] Test: Analytics API under load (10 req/s sustained)
- [ ] Test: Payment create API under load
- [ ] Document results in `_bmad-output/planning-artifacts/load-test-results.md`
- [ ] If bottlenecks found: document, do NOT prematurely optimize
- [ ] Verify rate limiting activates correctly under load
- [ ] Verify Redis connection pooling handles load

**Files:**
- `scripts/load-test-redirect.yml` — New (k6/Artillery config)
- `_bmad-output/planning-artifacts/load-test-results.md` — New

---

### 🟡 TASK 25.6 — Database Backup & Recovery

**Purpose:** Production data must be recoverable.

- [ ] Document Neon.tech backup strategy (automatic backups, point-in-time recovery)
- [ ] Create `scripts/db-backup-manual.sh` — Manual backup trigger
- [ ] Verify Drizzle migrations are in sync with schema
- [ ] Document disaster recovery steps:
  - How to restore from Neon backup
  - How to redeploy from scratch
  - Contact points for critical issues
- [ ] Add `DATABASE_URL` rotation procedure

**Files:**
- `_bmad-output/planning-artifacts/disaster-recovery.md` — New
- `scripts/db-backup-manual.sh` — New

---

### 🟡 TASK 25.7 — Documentation & README

**Purpose:** Project must be understandable by others (and future Rafi).

- [ ] Write comprehensive `README.md`:
  - What is LinkSnap
  - Tech stack
  - Getting started (clone → env → dev)
  - Project structure overview
  - Available scripts
  - Deployment guide
  - Architecture diagram (ASCII or link)
  - Contributing guidelines
- [ ] Verify API docs page is complete and accurate (`/docs`)
- [ ] Add inline code comments for complex logic (rule engine, payment flow, click queue)
- [ ] Document known limitations and future roadmap

**Files:**
- `README.md` — Rewrite
- `src/app/(dashboard)/docs/page.tsx` — Verify completeness

---

### 🟡 TASK 25.8 — Final PRD Gap Analysis

**Purpose:** Verify everything promised in PRD is actually built.

- [ ] Read PRD.md end-to-end
- [ ] Compare PRD promises vs IMPLEMENTATION.md reality:
  - All API endpoints exist ✅/❌
  - All features listed exist ✅/❌
  - All UI pages exist ✅/❌
  - All plan limits enforced ✅/❌
- [ ] Create gap report: what's in PRD but NOT implemented
- [ ] Categorize gaps:
  - "Must fix before launch" (P0)
  - "V2" (P1)
  - "Won't do" (P2, with rationale)
- [ ] Fix any P0 gaps immediately

**Files:**
- `_bmad-output/planning-artifacts/prd-gap-analysis.md` — New

---

### 🟡 TASK 25.9 — Google OAuth End-to-End Test

**Purpose:** Verify Google sign-in works in production. Only remaining auth gap.

- [ ] Configure Google Cloud Console for production:
  - Authorized JavaScript origins: production domain
  - Authorized redirect URIs: `{PROD_URL}/api/auth/callback/google`
- [ ] Test OAuth flow end-to-end:
  - Click "Sign in with Google"
  - Google consent screen appears
  - Redirect back to LinkSnap
  - New user auto-registered
  - Existing user linked
- [ ] Document OAuth setup in DEPLOY.md for future reference
- [ ] If OAuth secrets need rotation, document procedure

**Files:**
- `DEPLOY.md` — OAuth setup section
- `_bmad-output/planning-artifacts/oauth-setup-guide.md` — New

---

### 🟡 TASK 25.10 — Flutter Mobile App Build

**Purpose:** Complete remaining Phase 21 Flutter build tasks.

- [ ] Verify Flutter SDK installed and configured
- [ ] Run `flutter create --org id.linksnap apps/mobile_flutter` if not exists
- [ ] Run `flutter pub get` — must succeed
- [ ] Run `flutter build apk --release` — must complete < 10 min
- [ ] Verify APK at `build/app/outputs/flutter-apk/app-release.apk`
- [ ] Verify APK size < 25 MB
- [ ] Run `flutter build appbundle --release` for Play Store
- [ ] Test install on device — must not crash on launch
- [ ] App icon: gold-on-black with LinkSnap link logo (adaptive icon)
- [ ] Document mobile build process

**Files:**
- `apps/mobile_flutter/` — Verify/update
- `_bmad-output/implementation-artifacts/IMPLEMENTATION-MOBILE.md` — Update

---

### 🟡 TASK 25.11 — Final Quality Gate & Go-Live Checklist

**Purpose:** The gates. Everything must pass before production.

- [ ] Run complete quality gate:
  ```bash
  rtk bun run typecheck
  rtk bun run lint
  rtk bun run test              # All unit + integration
  rtk bun run test:e2e          # All E2E
  rtk bun run build             # Production build
  ```
- [ ] Verify: zero type errors, zero lint errors, all tests pass
- [ ] Verify: production build completes without warnings
- [ ] Final manual walkthrough of every dashboard page:
  - `/dashboard` — data loads, charts render, onboarding works
  - `/links` — list, search, create, edit, delete, bulk actions
  - `/pages` — cards with analytics, navigation
  - `/qr` — QR list, download, analytics
  - `/campaigns` — list with metrics, detail page, links management
  - `/analytics` — KPI cards, charts, filters, CSV export
  - `/settings` — all tabs functional
  - `/settings/billing` — payment history, upgrade flow, cancel
  - `/admin/*` — all pages load real data
  - `/docs` — API documentation complete
  - `/help` — FAQ + contact
- [ ] Verify all public pages:
  - `/` — landing page renders
  - `/pricing` — plans + toggle works
  - `/login` — form + Google button
  - `/register` — form works
  - `/blog/*` — all blog posts render
  - `/[slug]` — redirect works for existing link
- [ ] Go-live! 🚀

**Files:**
- `_bmad-output/planning-artifacts/launch-readiness-2026-05-09.md` — Final report

---

## 📊 Task Summary

| Task | Area | Priority |
|---|---|---|
| 25.1 | Production env & deployment | P0 |
| 25.2 | Security final audit | P0 |
| 25.3 | Accessibility & Lighthouse | P1 |
| 25.4 | Error tracking & observability | P1 |
| 25.5 | Load testing & performance | P1 |
| 25.6 | Database backup & recovery | P0 |
| 25.7 | Documentation & README | P1 |
| 25.8 | PRD gap analysis | P0 |
| 25.9 | Google OAuth e2e test | P0 |
| 25.10 | Flutter mobile build | P2 |
| 25.11 | Final quality gate & go-live | P0 |

**Total:** 11 tasks. Final phase. Ship it.

---

## 🎯 Success Criteria

After Phase 25:
- [ ] All 40 remaining checkboxes → checked
- [ ] Zero HIGH severity security issues
- [ ] Lighthouse score ≥ 95 on all key pages
- [ ] All API endpoints documented
- [ ] Production deployment ready
- [ ] Comprehensive README
- [ ] Backup/recovery plan documented
- [ ] Load test results documented
- [ ] PRD gap report complete
- [ ] 🚀 **LinkSnap is production-ready**
