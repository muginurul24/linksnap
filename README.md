# LinkSnap

Smart short links, micro landing pages, campaign analytics, and paid API access
for marketers, UMKM owners, creators, and developers.

Production URL: https://www.justqiu.cloud

## What LinkSnap Does

LinkSnap turns every short link into a conversion tool:

- Short links with random or custom slugs.
- Optional Link Pages with branded copy, CTA buttons, countdowns, social proof,
  QR display, and analytics.
- Smart redirect rules for geo, device, time, and language targeting.
- Campaign workbench with UTM templates, grouped analytics, and split testing.
- Dashboard analytics for clicks, unique visitors, devices, referrers, locations,
  campaign performance, and Link Page conversion.
- PayGate-backed subscriptions for Free, Pro, and Business plans.
- API keys and OpenAPI docs for paid users.
- Superadmin dashboard for user plan overrides, account suspension, system
  analytics, and audit logs.

## Stack

- Next.js 16 App Router, React 19, TypeScript strict.
- Bun runtime and package manager.
- Tailwind CSS 4 and shadcn/ui.
- Drizzle ORM with Neon Postgres.
- Upstash Redis for rate limiting, cache, and queues.
- NextAuth.js v5 for web sessions.
- Resend for transactional email.
- PayGate payment middleware.
- Vitest and Playwright for tests.
- Vercel for production hosting.

## Repository Map

| Path | Purpose |
| --- | --- |
| `src/app` | App Router pages, layouts, route groups, and API routes. |
| `src/app/api/v1` | Versioned REST route handlers. |
| `src/components` | UI primitives and dashboard components. |
| `src/lib` | Auth, database queries, cache, billing, observability, validation, and domain logic. |
| `src/lib/db/schema.ts` | Drizzle schema source of truth. |
| `src/lib/db/migrations` | Generated Drizzle migration baseline. |
| `tests/unit` | Unit tests for domain logic and components. |
| `tests/integration` | Route and flow-level integration tests. |
| `tests/e2e` | Playwright browser tests. |
| `_bmad-output` | Product, security, architecture, launch, and implementation artifacts. |
| `DEPLOY.md` | Production deployment checklist. |
| `ROADMAP.md` | Known limitations and launch roadmap. |

## Architecture

```text
Browser / API client
        |
        v
Next.js App Router + Proxy
        |
        +--> Route handlers in src/app/api/v1
        |       |
        |       +--> Auth/session guards
        |       +--> Zod validation
        |       +--> Drizzle query helpers
        |
        +--> Dashboard and public pages
                |
                +--> Components in src/components

Core services:
  Neon Postgres  <-->  Drizzle schema + migrations
  Upstash Redis  <-->  rate limits, cache, click queue, health metrics
  Resend         <-->  OTP, account, and invoice email
  PayGate        <-->  checkout, webhook settlement, subscription state
  Vercel Cron    <-->  click queue processing and subscription renewal
```

## Local Setup

Prerequisites:

- Bun.
- PostgreSQL-compatible Neon database URL.
- Upstash Redis REST URL and token.
- Resend and PayGate credentials for full payment/email flows.

Install dependencies:

```bash
rtk bun install
```

Create local env files from `.env.example`. Do not commit `.env`,
`.env.local`, `.env.production`, Vercel env pulls, database URLs, API tokens, or
provider secrets.

Run development server:

```bash
rtk bun run dev
```

Open http://localhost:3000.

## Environment

Use `.env.example` as the required variable inventory. Important production
groups:

- App URLs: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `APP_URL`,
  `AUTH_URL`, `NEXTAUTH_URL`.
- Auth: `AUTH_SECRET`, Google OAuth credentials, `AUTH_TRUST_HOST`.
- Data: `DATABASE_URL`, optional `MAXMIND_DB_PATH`.
- Cache: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`.
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
- Payment: `PAYGATE_API_BASE_URL`, `PAYGATE_STORE_API_TOKEN`,
  `PAYGATE_WEBHOOK_SECRET`.
- Operations: `CRON_SECRET`, `IP_HASH_SALT`, `USD_IDR_RATE`.

Verify production env shape:

```bash
rtk bun run verify:production-env
```

## Database

Generate migrations from `src/lib/db/schema.ts`:

```bash
rtk bun run db:generate
```

Apply migrations:

```bash
rtk bun run db:migrate
```

Open Drizzle Studio:

```bash
rtk bun run db:studio
```

Manual backup dry-run:

```bash
rtk proxy env BACKUP_DATABASE_URL='postgresql://...' bash scripts/db-backup-manual.sh --dry-run
```

See `_bmad-output/planning-artifacts/disaster-recovery.md` for restore and
redeploy procedures.

## API

API base URL:

```text
https://www.justqiu.cloud/api/v1
```

Paid users can access the dashboard API docs at `/docs`. Programmatic OpenAPI
JSON is available at `/api/v1/docs` using a paid session or API key.

API keys are sent as bearer tokens:

```http
Authorization: Bearer lsnap_sk_...
```

Every API error response includes a `requestId` for support tracing.

## Quality Gate

Run before every commit:

```bash
rtk bun run typecheck
rtk bun run lint
rtk bun run test
rtk bun run build
```

## Available Scripts

| Script | Purpose |
| --- | --- |
| `rtk bun run dev` | Start local Next.js dev server. |
| `rtk bun run build` | Build production app. |
| `rtk bun run start` | Serve production build locally. |
| `rtk bun run lint` | Run ESLint. |
| `rtk bun run typecheck` | Run TypeScript without emitting files. |
| `rtk bun run test` | Run Vitest unit and integration tests. |
| `rtk bun run test:e2e` | Run Playwright browser tests. |
| `rtk bun run db:generate` | Generate Drizzle migrations from schema. |
| `rtk bun run db:migrate` | Apply Drizzle migrations. |
| `rtk bun run db:studio` | Open Drizzle Studio. |
| `rtk bun run verify:production-env` | Validate production env shape. |
| `rtk bun run smoke:production` | Run production smoke checks. |
| `rtk bun run security:smoke` | Run basic penetration smoke checks. |

Targeted checks:

```bash
rtk bun run test:e2e
rtk bun run smoke:production
rtk bun run security:smoke
```

Production smoke with a session cookie:

```bash
rtk proxy env PRODUCTION_SMOKE_COOKIE='next-auth.session-token=...' bun run smoke:production
```

## Deployment

Production deploys to Vercel from `main`.

Before deploying:

1. Pull latest `main`.
2. Run the quality gate.
3. Verify production env.
4. Push to `main`.
5. Watch Vercel deployment logs.
6. Run production smoke and security smoke.
7. Verify PayGate checkout/webhook and Google OAuth.

See `DEPLOY.md` for the full deployment checklist.

## Contributing

- Pull latest `main` before starting: `rtk git pull --rebase`.
- Follow `_bmad-output/implementation-artifacts/IMPLEMENTATION.md` task order.
- Keep commits scoped to one task or logical change.
- Use Conventional Commit messages.
- Run typecheck, lint, full tests, targeted E2E, and build before pushing.
- Update `_bmad-output/implementation-artifacts/JOURNAL.md` for every task.
- Do not add new ORMs, CSS frameworks, auth libraries, or raw SQL paths.
- Do not commit secrets, `.env` files, generated backup dumps, or provider
  dashboard exports.

## Operations

Key launch artifacts:

- `_bmad-output/planning-artifacts/monitoring-observability.md`
- `_bmad-output/planning-artifacts/load-test-results.md`
- `_bmad-output/planning-artifacts/security-audit-2026-05-09.md`
- `_bmad-output/planning-artifacts/accessibility-lighthouse-2026-05-09.md`
- `_bmad-output/planning-artifacts/disaster-recovery.md`

Health endpoint:

```text
GET /api/v1/health
```

Scheduled jobs are configured in `vercel.json` and require
`Authorization: Bearer ${CRON_SECRET}`.

## Known Limitations

- Custom domains, team workspaces, password-protected links, enterprise SSO,
  white-label reseller flows, and affiliate/referral programs are planned after
  MVP.
- Google OAuth and PayGate production verification require provider dashboard
  access and live credentials.
- Load-test scripts are guarded and should only run against production after
  explicit operator approval.
- Manual `pg_dump` backups require an unpooled Neon connection string.

See `ROADMAP.md` for the detailed roadmap and launch limitations.
