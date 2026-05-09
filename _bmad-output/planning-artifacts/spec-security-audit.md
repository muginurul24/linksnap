# Tech Spec: Security Audit

## Problem
The launch checklist requires a security pass across OWASP coverage, SQL
injection posture, XSS handling, CSRF protections, rate limiting, and security
headers before final launch readiness work.

## Approach
Run code-level security searches, patch high-value gaps that can be fixed in
the app, and document residual infrastructure or operational risks separately.
Use Next.js `headers()` configuration for baseline security headers, a proxy
guard for mutating `/api/v1/*` browser requests, and remove avoidable
`dangerouslySetInnerHTML` use from chart styling.

## Affected Files
- `next.config.ts`
- `src/proxy.ts`
- `src/lib/security/*`
- `src/components/ui/chart.tsx`
- `tests/unit/*security*.test.ts`
- `_bmad-output/planning-artifacts/security-audit-2026-05-07.md`
- `_bmad-output/planning-artifacts/SECURITY.md`

## Acceptance Criteria
- [x] Security headers are applied to all routes.
- [x] Mutating API routes reject untrusted origins and missing custom headers.
- [x] PayGate webhook remains compatible with server-to-server callbacks.
- [x] `dangerouslySetInnerHTML` no longer appears in `src/`.
- [x] Raw SQL, exec/spawn, unsafe fetch, and N+1 scans are documented.
- [x] Typecheck, lint, tests, and build pass.

## Risks
- CSP can block required Next.js runtime scripts or payment redirects if too
  strict.
- API CSRF checks can accidentally block legitimate webhooks or cron jobs.
- Infrastructure-only controls cannot be fully verified locally.
