# LinkSnap — Coding Journal

> **For Codex:** After EVERY task in IMPLEMENTATION.md or IMPLEMENTATION-MOBILE.md,
> append a numbered entry below. This journal is reviewed by Claw Kun for quality control.

---

## 📋 Journal Format

Every entry MUST follow this format:

```markdown
### [PHASE].[TASK] — [Title]
- **Date:** YYYY-MM-DD HH:MM GMT+7
- **Duration:** X hours Y minutes
- **Status:** ✅ Complete / ⚠️ Partial / ❌ Blocked

**What I Did:**
[2-3 sentences describing what was implemented]

**Files Changed:**
- `src/app/api/v1/links/route.ts` — [what changed]
- `tests/unit/links.test.ts` — [what changed]

**Decisions Made:**
- [Decision 1 with rationale]
- [Decision 2 with rationale]

**Tests:**
- ✅ Unit: [test file] — [results]
- ✅ Integration: [test file] — [results]
- ⬜ E2E: [pending]

**Issues Encountered:**
- [Issue 1] → [How I resolved it]
- [Issue 2] → [Still investigating]

**Security Checks:**
- ✅ Input validated with Zod
- ✅ Ownership verified
- ✅ Rate limiting applied
- ✅ No sensitive data in logs

**Next Task:** [PHASE].[TASK] — [Title]
```

---

## 📅 Journal Entries

### 0.0 — Project Initialized
- **Date:** 2026-05-06 18:30 GMT+7
- **Duration:** Setup session
- **Status:** ✅ Complete

**What I Did:**
Project initialized by Claw Kun. Next.js 16.2.4 + Bun + TypeScript + Tailwind CSS + shadcn/ui components installed. Drizzle ORM schema created (9 tables), NextAuth v5 configured, Upstash Redis client set up. Full dashboard template with sidebar, 9 routes, and comprehensive IMPLEMENTATION.md checklist created. SECURITY.md and mobile implementation plan added.

**Files Created:**
- `src/lib/db/schema.ts` — Full Drizzle schema (users, links, linkPages, smartRules, clickEvents, campaigns, splitTests, subscriptions, transactions, settings)
- `src/lib/db/index.ts` — Lazy Neon DB connection
- `src/lib/auth/index.ts` — NextAuth v5 config (Google + Credentials)
- `src/lib/redis/index.ts` — Upstash Redis client
- `src/app/(dashboard)/**` — 9 dashboard pages with full UI
- `src/components/dashboard/**` — AppSidebar + AppHeader
- `src/components/ui/button-link.tsx` — Custom button-link component
- `_bmad-output/planning-artifacts/PRD.md` — 626-line product requirements
- `_bmad-output/planning-artifacts/SECURITY.md` — 16-category security checklist
- `_bmad-output/planning-artifacts/IMPLEMENTATION-MOBILE.md` — 24-task mobile plan
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md` — 54-task web checklist
- `_bmad-output/implementation-artifacts/JOURNAL.md` — This file
- `AGENTS.md` — Codex instructions (RTK mandatory + BMad process)
- `project-context.md` — Constitution for AI agents

**Decisions Made:**
- Next.js monolith (not microservices) — simpler ops for MVP, split only when 50K+ users
- Drizzle ORM over Prisma — type-safe, lightweight, no codegen
- NextAuth JWT strategy (not database sessions) — avoids adapter schema conflicts
- Lazy DB connection — prevents build-time errors when DATABASE_URL not set
- shadcn/ui v4 with Base UI — modern, accessible component library
- Bun as package manager — faster than npm/pnpm

**Tests:**
- ⬜ Pending — tests will be written per task

**Issues Encountered:**
- `asChild` prop not supported in shadcn v4 Button/DropdownMenuItem — resolved by creating custom `ButtonLink` component and using plain `<a>` tags instead
- `delayDuration` prop removed from TooltipProvider in newer shadcn — resolved by using default
- recharts `createContext` error in server components — resolved by adding `"use client"` directive to pages using charts

**Security Checks:**
- ✅ All API inputs to be validated with Zod (schemas defined)
- ✅ JWT httpOnly cookies configured
- ✅ Password hashing with bcryptjs
- ✅ Rate limiting strategy documented in SECURITY.md

**Next Task:** Phase 0.1 — Environment Setup (fill .env variables)

---

> **Note to Codex:** Append your entries below this line. Follow the format strictly.
> Claw Kun reviews this journal for quality, consistency, and decision-making quality.
