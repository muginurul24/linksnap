# AGENTS.md — LinkSnap

Pahami dengan sangat detail terlebih dahulu mengenai project ini sampai goal, dengan sangat detail.
Referensinya semua ada di folder \_bmad-output

Baca \_bmad-output/implementation-artifacts/IMPLEMENTATION.md, \_bmad-output/planning-artifacts/IMPLEMENTATION-MOBILE.md, \_bmad-output/planning-artifacts/SECURITY.md
dari awal. Mulai dari Phase Unchecklist — Environment Setup.

Setelah tiap task selesai, catat progress di
\_bmad-output/implementation-artifacts/JOURNAL.md
sesuai format yang udah ada dan harus di checklist apa yang sudah dikerjakan, setelah itu commit dan push.

## 🚨 RTK — MANDATORY

**ALWAYS prefix ALL terminal commands with `rtk`.** No exceptions.

```bash
# ✅ Correct
rtk bun run dev && rtk bun run build && rtk bun run test
rtk bun add some-package
rtk git add . && rtk git commit -m "feat: description"

# ❌ Wrong
bun run dev
```

## Project Overview

LinkSnap — Smart Short Links & Micro Landing Pages Platform.
Built with Next.js 16 + App Router, PostgreSQL (Drizzle ORM), Redis, Tailwind + shadcn/ui.

## Commands

- Dev: `bun run dev`
- Build: `bun run build`
- Test: `bun run test` (vitest)
- Lint: `bun run lint` (biome)
- Typecheck: `bun run typecheck`
- E2E: `bun run test:e2e` (playwright)
- DB: `bun run db:push` (push schema), `bun run db:migrate`, `bun run db:studio`

## Package Manager

- Use `bun`. Never npm, yarn, or pnpm for this project.

## Development Process: BMad Method

This project follows BMad Method — AI-driven agile with 4 phases:

1. Analysis → 2. Planning (PRD.md) → 3. Solutioning (architecture.md) → 4. Implementation

### Context Chain

- PRD → tells architect what constraints matter.
- Architecture → tells developer which patterns to follow.
- project-context.md → ensures all agents follow same conventions.

### Key BMad Principles

1. Read `_bmad-output/project-context.md` before implementing anything.
2. Each document becomes context for the next phase.
3. Make technical decisions explicit and documented.
4. Adversarial code reviews: find 10+ issues minimum.
5. Before implementing: validate all planning docs are cohesive.

## Project Structure

```
_bmad-output/
  planning-artifacts/
    PRD.md           # Requirements
    architecture.md  # Coming soon
    epics/           # Coming soon
  implementation-artifacts/
    sprint-status.yaml
  project-context.md # Constitution

src/
  app/              # Next.js App Router
  components/       # React components
  lib/              # Business logic, DB, auth, etc.
content/            # MDX blog
tests/              # Vitest + Playwright
```

## Tech Stack

- Next.js 16 (App Router, RSC)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Drizzle ORM + PostgreSQL (Neon.tech)
- Redis (Upstash) for cache, rate limiting
- NextAuth.js v5 for authentication
- Midtrans for payments
- Resend for email

## Constraints

- No custom CSS framework — use Tailwind + shadcn/ui only.
- No ORM other than Drizzle.
- API routes only in src/app/api/v1/.
- Server Components by default; 'use client' only when needed.
- All external API calls go through lib/ modules, never inline.

## Do Not Touch

- Environment variables without discussion.
- next.config.ts without understanding implications.
- Drizzle migrations once applied to production.
