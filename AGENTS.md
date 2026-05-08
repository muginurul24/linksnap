# AGENTS.md — LinkSnap

> **Your job:** Read the full plan. Execute tasks from IMPLEMENTATION.md in order.
> Log every task in JOURNAL.md. Commit + push after each. Claw Kun reviews your work.

---

## ⚡ Quick Start Every Session

Before you write ANY code, do this:

```bash
rtk git pull --rebase
```

Then read these files (in order):
1. `_bmad-output/project-context.md` — tech stack, conventions, constraints
2. `_bmad-output/planning-artifacts/PRD.md` — what we're building and why
3. `_bmad-output/planning-artifacts/SECURITY.md` — mandatory security rules
4. `_bmad-output/implementation-artifacts/IMPLEMENTATION.md` — your task checklist
5. `_bmad-output/implementation-artifacts/JOURNAL.md` — see what's already done

---

## 🚨 RTK — MANDATORY

```bash
# ✅ Correct
rtk bun run dev
rtk bun run test
rtk git add . && rtk git commit -m "feat: description" && rtk git push

# ❌ Wrong
bun run dev
git add .
```

---

## 📋 How You Work

### Task Flow
1. Find the next unchecked `[ ]` task in `IMPLEMENTATION.md`
2. Mark it `[x]` before starting (so Claw Kun can see progress)
3. Implement the task — follow code patterns in the IMPLEMENTATION.md reference
4. Verify: `rtk bun run typecheck && rtk bun run lint && rtk bun run test`
5. Append an entry to `JOURNAL.md` (use the format in there)
6. Commit: `rtk git add . && rtk git commit -m "feat(scope): description" && rtk git push`
7. Move to next task

### Journal Format (copy this exactly)

```
### X.Y — Task Title
- **Date:** YYYY-MM-DD HH:MM GMT+7
- **Duration:** Xh Ym
- **Status:** ✅ Complete / ⚠️ Partial / ❌ Blocked

**What I Did:**
[Brief description]

**Files Changed:**
- path/file.ts — what changed

**Decisions Made:**
- Decision → rationale

**Tests:**
- ✅ Typecheck / Lint / Unit / Build

**Issues Encountered:**
- Issue → resolution

**Security Checks:**
- ✅ Input validated / Ownership verified / Rate limiting / No secrets

**Next Task:** X.Y — Title
```

### When You're Stuck
- If a task needs credentials I don't have: mark it ⚠️ Partial, note what's missing, move to the next task
- If a task depends on an external service (Google Cloud Console, PayGate dashboard): same approach
- Never block the whole flow on one task — keep moving forward

---

## 🔗 Project: LinkSnap

**Stack:**
- Next.js 16 (App Router) + React 19 + TypeScript 5.9 strict
- Tailwind CSS 4 + shadcn/ui (New York style)
- Drizzle ORM + PostgreSQL (Neon.tech)
- Redis (Upstash) — cache, rate limiting, sessions
- NextAuth.js v5 — Google OAuth + Credentials
- Resend — transactional email
- PayGate — payment middleware
- Framer Motion — animations
- Inter (sans) + JetBrains Mono (mono) — fonts
- Vitest + Playwright — testing

**Package manager:** Bun. Never npm, yarn, or pnpm.

**Commands:**
```
rtk bun run dev          # Start dev server (localhost:3000)
rtk bun run build        # Production build
rtk bun run test         # Vitest unit/integration
rtk bun run test:e2e     # Playwright E2E
rtk bun run typecheck    # TypeScript check
rtk bun run lint         # ESLint
rtk bun run db:push      # Push Drizzle schema to DB
rtk bun run db:studio    # Drizzle Studio GUI
```

**Auth endpoints (ready):**
- `POST /api/v1/auth/register` — create account + send OTP
- `POST /api/v1/auth/verify` — verify email with OTP
- `POST /api/v1/auth/resend-otp` — resend verification code
- `POST /api/auth/callback/google` — Google OAuth callback
- `POST /api/auth/signin` — NextAuth sign-in

**Rate limits active:**
- Register: 3/IP/hour
- Login: 5/IP/15min  
- Resend OTP: 3/email/hour
- Globally on all endpoints via sliding window (Redis)

**Dashboard routes (protected, proxy.ts gate):**
- `/` — Overview (stats, chart, recent links)
- `/links` — Links table
- `/pages` — Link Pages gallery
- `/qr` — QR Codes grid
- `/campaigns` — Campaign cards
- `/analytics` — Charts (area/pie/bar)
- `/settings` — Profile/Notifications/Security/API
- `/settings/billing` — Plans comparison

**Public routes:**
- `/` — Landing page (Framer Motion animations)
- `/register` — Registration form
- `/login` — Sign-in form
- `/verify` — Email verification

---

## 🛡️ Security Rules (Read SECURITY.md too)

Before finishing ANY task, verify:
- [ ] All user input validated with Zod
- [ ] API routes verify ownership (user can only access their own data)
- [ ] Rate limiting applied where applicable
- [ ] No secrets, passwords, tokens in code or logs
- [ ] No `dangerouslySetInnerHTML` without DOMPurify
- [ ] No N+1 queries — batch all database reads
- [ ] All responses use standard format: `{ success, data/error }`

---

## 📐 Code Patterns

### API Route
```typescript
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { someSchema } from "@/lib/validations/some";
import { success, error } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user) return error("AUTHENTICATION_REQUIRED", 401);

    // 2. Validate
    const body = someSchema.safeParse(await req.json());
    if (!body.success) return error("VALIDATION_ERROR", 400, body.error.flatten());

    // 3. Authorize + Execute
    // ...

    // 4. Respond
    return success(data, 201);
  } catch (e) {
    return error("INTERNAL_ERROR", 500);
  }
}
```

### Database Query (always in lib/db/queries/)
```typescript
import { db } from "@/lib/db";
import { table } from "@/lib/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";

// ✅ Batch queries — never loop-queries
const items = await db.select().from(table)
  .where(eq(table.userId, userId))
  .orderBy(desc(table.createdAt))
  .limit(20).offset(0);
```

---

## 🤝 Working with Claw Kun

- Claw Kun is the architect and reviewer for this project.
- He monitors `JOURNAL.md` for quality and will leave feedback.
- If he requests changes, prioritize them.
- He may push commits to this branch — pull before starting.
- When in doubt about architecture or direction, note it in the journal.
- Claw Kun handles: PRD updates, SECURITY.md, architecture decisions, code review.
- Codex handles: Implementation, testing, CI/CD, environment setup.

---

## ⚠️ Constraints

- **Never** introduce a new ORM — Drizzle only.
- **Never** introduce a new CSS framework — Tailwind + shadcn/ui only.
- **Never** introduce a new auth library — NextAuth.js v5 only.
- **Never** modify `next.config.ts` without understanding implications.
- **Never** commit `.env` files.
- **Never** use raw SQL — Drizzle parameterized queries only.
- **Never** skip typecheck before commit.
