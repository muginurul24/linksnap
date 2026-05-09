# Security Audit — 2026-05-07

## Scope
Task 10.4 covered OWASP Top 10 launch checks, SQL injection posture, XSS
handling, CSRF controls, public endpoint rate limits, and security headers for
the current Next.js web app.

## Changes Applied
- Added global security headers and CSP through `next.config.ts`.
- Added `/api/v1/*` mutation guard in `src/proxy.ts` for trusted `Origin` and
  `X-Requested-With: XMLHttpRequest`.
- Exempted `POST /api/v1/payments/webhook` from the custom browser header while
  preserving origin checks and PayGate signature validation.
- Removed `dangerouslySetInnerHTML` from chart styling and added CSS
  identifier/color sanitization.
- Added rate limiting to `POST /api/v1/auth/verify`.
- Added unit tests for security headers, API mutation checks, and chart style
  sanitization.

## Evidence
- Raw SQL scan: no tagged SQL templates, `db.execute`, `.execute(`, or `raw(`
  matches in `src`.
- Dangerous HTML scan: no `dangerouslySetInnerHTML` matches in `src`.
- Command execution scan: no `child_process`, `exec(`, `spawn(`, `eval(`, or
  `new Function` use; the only `exec`-like match was safe `RegExp.exec`.
- User-controlled fetch scan: no `fetch(req|request|body|params|searchParams|form|input|url)`
  matches.
- N+1 scan: only async map match was build-time MDX blog frontmatter loading,
  not database work.
- API body scan: every `request.json().catch(() => null)` route result is
  followed by Zod `safeParse`.

## Findings
- HIGH fixed: baseline security headers and CSP were absent from `next.config.ts`.
- HIGH fixed: mutating `/api/v1/*` routes did not have centralized Origin/custom
  header enforcement before reaching route handlers.
- MEDIUM fixed: `src/components/ui/chart.tsx` used `dangerouslySetInnerHTML` for
  generated CSS.
- MEDIUM fixed: `POST /api/v1/auth/verify` was missing OTP brute-force rate
  limiting.
- MEDIUM pass: PayGate webhook verifies HMAC-SHA256 signatures with
  `timingSafeEqual` before processing.
- MEDIUM pass: cron subscription renewal requires `Authorization: Bearer
  CRON_SECRET`.
- MEDIUM residual: redirect abuse limiting is best enforced at Cloudflare/WAF to
  preserve the p50 redirect latency target; app-level Redis checks would add
  latency to the hot redirect path.
- MEDIUM residual: SameSite cookie mode is left to NextAuth defaults for OAuth
  compatibility; API mutation CSRF guard now covers app state-changing routes.
- LOW residual: no live OWASP ZAP, load test, or external WAF verification was
  run locally.
- LOW residual: database role privileges and production TLS/HSTS behavior require
  production infrastructure verification.

## Verification Required Before Launch
- Confirm Vercel/Cloudflare serves the new headers over HTTPS.
- Add Cloudflare WAF/rate rules for `/:slug` and `/:slug/go` redirect traffic.
- Run OWASP ZAP against staging.
- Run the launch load test for 5000 concurrent redirects.
- Confirm production `AUTH_URL`, `AUTH_TRUST_HOST`, domain, and OAuth callback
  settings to avoid localhost `UntrustedHost` noise.
