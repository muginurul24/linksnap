# project-context.md — LinkSnap

## Technology Stack & Versions
- **Web:** Next.js 16 (App Router), React 19, TypeScript 5.9
- **Mobile:** React Native 0.78 (Expo SDK 54), Expo Router, TypeScript
- **Shared:** TypeScript types + Zod schemas (monorepo package)
- **Runtime:** Bun (web), Node.js (mobile tooling)
- **Styling:** Tailwind CSS 4 + shadcn/ui (web), NativeWind (mobile)
- **Database:** PostgreSQL 16 (Neon.tech serverless)
- **ORM:** Drizzle ORM — no raw SQL
- **Cache:** Redis 7 (Upstash serverless)
- **Auth:** NextAuth.js v5 (web), SecureStore + JWT (mobile)
- **Email:** Resend
- **Payment:** PayGate middleware
- **Testing:** Vitest + Playwright (web), Jest + Detox (mobile)
- **Linting:** Biome
- **Hosting:** Vercel (web), EAS (mobile)

## Code Organization

### Web
- `src/app/` — Next.js App Router (marketing + dashboard route groups)
- `src/app/api/v1/` — REST API routes
- `src/lib/` — Business logic (no JSX in lib)
- `src/components/ui/` — shadcn primitives
- `src/components/dashboard/` — Dashboard-specific components

### Mobile
- `apps/mobile/app/` — Expo Router file-based routing
- `apps/mobile/src/lib/api/` — API client
- `apps/mobile/src/lib/stores/` — Zustand stores
- `apps/mobile/src/components/ui/` — Mobile UI components

### Shared
- `packages/shared/` — Zod schemas, TypeScript types, constants

## Critical Implementation Rules

**TypeScript:**
- Strict mode everywhere — no `any` without `@ts-expect-error`
- Zod validation on ALL input boundaries (API routes, form submissions)
- Explicit return types on exported functions

**Security (MANDATORY — see SECURITY.md for full checklist):**
- 🔒 NO raw SQL — Drizzle ORM parameterized only
- 🔒 NO `dangerouslySetInnerHTML` without DOMPurify
- 🔒 NO secrets in source code — use env vars only
- 🔒 NO user input in `fetch()` URLs — must be validated
- 🔒 Every API route: validate → authenticate → authorize → rate limit → execute
- 🔒 JWT httpOnly Strict cookies (web), SecureStore (mobile)
- 🔒 CSP headers on all responses
- 🔒 Rate limiting on ALL public endpoints
- 🔒 Ownership verification on ALL user-data endpoints
- 🔒 Input sanitization: Zod `.strict()` strip unknown fields

**Database:**
- All queries in `lib/db/queries/` — never inline
- Drizzle transactions for multi-table operations
- NO N+1 — use batch queries or `.with()` relations
- Connection pooling via Neon

**API Patterns:**
- Standard response: `{ success, data/error }`
- Error codes: VALIDATION_ERROR, AUTHENTICATION_REQUIRED, RATE_LIMITED, etc.
- `requestId` on every response for tracing
- API versioning: `/v1/`

**Testing:**
- Coverage targets: core logic ≥90%, routes ≥85%, UI ≥70%
- Security tests mandatory before production
- Load test: 5000 concurrent redirects target

**Styling:**
- Tailwind only — no CSS modules, no inline styles
- Dark mode default (class-based toggle)
- Mobile-first responsive (web), NativeWind utility-first (mobile)

## What NOT to Do
- ❌ No new ORM — Drizzle only
- ❌ No new CSS framework — Tailwind only
- ❌ No new auth library — NextAuth + SecureStore only
- ❌ No raw SQL queries
- ❌ No hardcoded secrets
- ❌ No `dangerouslySetInnerHTML`
- ❌ No N+1 queries
- ❌ No plaintext IP storage — hash before storing
- ❌ No `.env` in git
- ❌ No skipping typecheck or lint before push
