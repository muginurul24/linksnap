# LinkSnap — Security Implementation Checklist

> **Phase 25.2 status:** Closed on 2026-05-09.
> **Detailed audit:** `_bmad-output/planning-artifacts/security-audit-2026-05-09.md`.

This document is the launch security checklist. Items that are verifiable from the repository are backed by code scans and tests. Items that require provider dashboard access are closed as documented operational controls and must be confirmed during the final go-live walkthrough.

---

## OWASP Top 10 Coverage

### SEC-01: Broken Access Control

- [x] **Middleware auth gate** — Dashboard surfaces are protected via `src/proxy.ts`; public auth/static routes are excluded.
- [x] **Ownership verification** — User-data API routes verify resource ownership before returning, updating, or deleting records.
- [x] **Role-based access** — Admin routes use shared admin guards and return 403 for non-admin users.
- [x] **Plan-gated features** — Link, QR, Link Page, Smart Rules, API, and billing flows enforce plan gates server-side.
- [x] **IDOR prevention** — UUID params are validated and scoped to the authenticated owner.
- [x] **Direct object reference tests** — Integration/unit tests cover 403 behavior for unauthorized resources and admin mutations.

### SEC-02: Cryptographic Failures

- [x] **Password hashing** — bcryptjs with configured production-grade cost.
- [x] **JWT secret** — `AUTH_SECRET` documented as minimum 32 characters and verified by production env script.
- [x] **TLS everywhere** — Production deployment requires HTTPS on Vercel/Cloudflare; HSTS is configured.
- [x] **Sensitive token storage** — Reset tokens, refresh tokens, API keys, and IPs are hashed before persistence where applicable.
- [x] **No hardcoded secrets** — Source scan completed; only `.env.example` is tracked.

### SEC-03: Injection Attacks

- [x] **Drizzle ORM all queries** — No raw string SQL execution found in source.
- [x] **Parameterized query posture** — Drizzle `sql` expressions found are typed expressions, not string concatenation execution.
- [x] **No command injection path** — App source has no user-input `exec`, `spawn`, or shell execution path.
- [x] **Database user permissions** — Least-privilege DB role is documented as a Neon production setup requirement.
- [x] **NoSQL injection** — Not applicable; PostgreSQL only.

### SEC-04: Cross-Site Scripting (XSS)

- [x] **React auto-escaping** — User content renders through JSX.
- [x] **No dangerous HTML sinks** — Final scan found no `dangerouslySetInnerHTML`.
- [x] **No string evaluation** — Final scan found no `eval`, `new Function`, or string-based timers.
- [x] **URL validation** — User-submitted URLs must be HTTP(S) and reject localhost/private/internal hosts.
- [x] **SVG upload posture** — User SVG upload is not supported; generated QR SVG output is server-generated.
- [x] **Content-Security-Policy header** — Nonce-based CSP is configured via `src/lib/security/headers.ts`.

### SEC-05: Cross-Site Request Forgery (CSRF / XSRF)

- [x] **NextAuth CSRF protection** — NextAuth protects auth callbacks.
- [x] **SameSite cookies** — Session cookie posture is covered by NextAuth production config and HTTPS requirements.
- [x] **State-changing operations** — Mutating `/api/v1/*` routes require auth/session or a dedicated server-to-server secret/signature.
- [x] **Origin/Referer check** — Proxy validates trusted origins for mutating API requests.
- [x] **Custom header requirement** — Proxy enforces `X-Requested-With: XMLHttpRequest` for browser mutations, with webhook/API-key exceptions.

### SEC-06: Security Misconfiguration

- [x] **Security headers** — HSTS, `nosniff`, `DENY`, referrer policy, permissions policy, and CSP are configured and tested.
- [x] **No verbose responses** — Production error responses are generic and include `requestId`, not raw stack traces.
- [x] **No directory listing** — Vercel/Next.js deployment model prevents directory listing.
- [x] **CORS/origin configuration** — Mutating API origin checks are restricted to configured app origins.
- [x] **Environment variables** — `.env*` files are ignored except `.env.example`.

### SEC-07: DDoS Protection & Rate Limiting

- [x] **Global/API rate limits** — Redis-backed sliding-window limits cover auth, API, link creation, payment, redirect, and cron-sensitive paths.
- [x] **Auth endpoint limits** — Login, register, OTP resend, verification, password reset, and password change are rate-limited.
- [x] **Redirect endpoint protection** — Redirect and CTA paths use dedicated rate limiting and bot allowances.
- [x] **Cloudflare/Vercel mitigation** — Edge DDoS, WAF, bot, and challenge controls are documented provider requirements.
- [x] **Resource protection** — Payload limits, query range caps, Redis/Neon deployment requirements, and timeout posture are documented.

### SEC-08: N+1 Problem Prevention

- [x] **Batched query posture** — Dashboard, analytics, campaigns, Link Pages, and QR list paths use aggregate/batched query helpers.
- [x] **Campaign analytics** — Uses aggregate query paths instead of per-link loops.
- [x] **Dashboard overview** — Uses query helpers that batch summaries and recent resources.
- [x] **DB query audit** — Final review found no new obvious per-row awaited query loops in Phase 25.2 scope.

### SEC-09: Input Validation & Sanitization

- [x] **Zod schemas on API inputs** — Implemented API routes validate body, params, and query input with Zod.
- [x] **Slug validation** — Slugs are constrained to lowercase letters, numbers, and hyphens.
- [x] **URL validation** — Destination URL validation rejects dangerous protocols and internal hosts.
- [x] **Email validation** — Auth/account flows validate email input and verification state.
- [x] **String length limits** — Auth, settings, link, campaign, page, and payment inputs have length/type constraints.
- [x] **Unknown field handling** — Strict schemas reject or normalize unexpected input at boundaries.

### SEC-10: SSRF Prevention

- [x] **Destination URL validation** — Stored redirect destinations reject internal/private/local hosts.
- [x] **Webhook validation** — PayGate webhook payloads are authenticated with HMAC and timing-safe comparison.
- [x] **No user-controlled server fetch** — Final scan found no server-side `fetch()` path fed by user input.
- [x] **Payment outbound URL posture** — PayGate requests use environment-controlled `PAYGATE_API_BASE_URL`; production must keep it on HTTPS PayGate infrastructure.

---

## Additional Security Hardening

### SEC-11: Authentication Security

- [x] **Account abuse throttling** — Auth and password-related endpoints have Redis rate limits.
- [x] **Password policy** — Minimum length plus letter/number requirements.
- [x] **Session timeout posture** — Session timeout helpers and tests are present; final auth behavior is covered in quality gates.
- [x] **Refresh token security** — Mobile refresh tokens are hashed and rotation/revocation paths are implemented.
- [x] **2FA controls** — TOTP setup, verification, backup codes, challenge, and disable flows are implemented.
- [x] **Suspicious activity posture** — Security event logging and monitoring guidance are documented.

### SEC-12: Payment Security

- [x] **PayGate signature verification** — HMAC-SHA256 verification on webhook processing.
- [x] **Amount validation server-side** — Webhook amount must match local transaction before subscription activation.
- [x] **Payment method allowlist** — Channels are resolved through the payment channel registry.
- [x] **Idempotent webhooks** — Terminal states do not double-activate subscriptions.
- [x] **No card data storage** — LinkSnap stores only transaction/order metadata, never card data.
- [x] **Webhook IP allowlist** — Documented as PayGate provider-side hardening where supported.

### SEC-13: Data Protection

- [x] **Data deletion path** — Account deletion flow exists and clears sensitive user fields.
- [x] **Data retention policy** — Analytics retention is documented as a production policy requirement.
- [x] **IP anonymization** — Click logging hashes IPs immediately.
- [x] **PII minimization** — Product collects only account, billing, and analytics data needed for LinkSnap features.
- [x] **Encryption at rest** — Neon provider encryption is documented as production requirement.
- [x] **Encryption in transit** — HTTPS/TLS production requirement is documented and HSTS is configured.

### SEC-14: Dependency Security

- [x] **Dependency audit** — `rtk bun audit` passed with no vulnerabilities on 2026-05-09.
- [x] **Patched transitive dependencies** — Overrides force patched `esbuild`, `hono`, `ip-address`, and `postcss`.
- [x] **Lockfile committed** — `bun.lock` is version controlled.
- [x] **No deprecated package gate** — Final audit documents dependency posture; quarterly review remains operational practice.
- [x] **Minimal dependency discipline** — New dependency additions require audit and quality gates.

### SEC-15: Logging & Monitoring

- [x] **Security events logged** — Admin failures, webhook failures, auth/rate-limit failures, and cache failures are logged with request context.
- [x] **Structured logging** — `src/lib/observability/logger.ts` writes JSON logs.
- [x] **No sensitive data in logs** — Logger redacts sensitive keys before output.
- [x] **No production stack traces in logs** — Logger omits `error.stack` when `NODE_ENV=production`.
- [x] **Alert thresholds** — Monitoring recommendations are documented in deployment/security audit artifacts.
- [x] **Audit trail** — Admin user mutations are logged with actor, target, action, and request ID.

### SEC-16: Infrastructure Security

- [x] **Cloudflare WAF rules** — SQLi/XSS/file-inclusion managed rules documented for final provider setup.
- [x] **Cloudflare bot mitigation** — Bot Fight/Bot Management documented for final provider setup.
- [x] **Vercel secure environment variables** — Production envs are documented and verified by `scripts/verify-production-env.sh`.
- [x] **Database access controls** — Neon least-privilege role, PITR, and restore controls are documented.
- [x] **Redis controls** — Upstash TLS/token controls and restricted-command posture are documented.

---

## Final Verification Commands

```bash
rtk rg -n "console\\.(log|debug|info|warn|error)|debugger\\b" src scripts --glob '*.{ts,tsx,js,jsx}'
rtk rg -n "dangerouslySetInnerHTML|eval\\(|new Function|setTimeout\\(\\s*['\\\"]|setInterval\\(\\s*['\\\"]" src --glob '*.{ts,tsx}'
rtk rg -n "await fetch|fetch\\(" src/app/api src/lib --glob '*.{ts,tsx}'
rtk rg -n "debug|dev-only|TODO|FIXME|test-only|__debug" src/app src/lib --glob '*.{ts,tsx}'
rtk rg -n 'sql`|db\\.execute|\\.execute\\(|raw\\(' src --glob '*.{ts,tsx}'
rtk git ls-files .env .env.example .env.local .env.production .env.production.local .env.test.local
rtk bun audit
```

**2026-05-09 result:** Passed. See `security-audit-2026-05-09.md` for command notes.

---

## Security Scorecard

| Category | Status | Notes |
|---|---|---|
| Access Control | [x] | Middleware, ownership, RBAC, IDOR tests |
| Cryptography | [x] | bcrypt, strong secrets, hashes, HTTPS posture |
| Injection | [x] | Drizzle, no command injection path |
| XSS | [x] | JSX escaping, no dangerous sinks, CSP |
| CSRF | [x] | NextAuth, origin checks, custom mutation header |
| Misconfiguration | [x] | Headers, env hygiene, generic errors |
| DDoS / Rate Limiting | [x] | Redis limits plus Cloudflare/Vercel runbook |
| N+1 Prevention | [x] | Batched dashboard and analytics query paths |
| Input Validation | [x] | Zod schemas and strict URL/slug checks |
| SSRF | [x] | Internal URL blocking, no server fetch from user input |
| Auth Security | [x] | Rate limits, password policy, 2FA, refresh-token hashes |
| Payment Security | [x] | HMAC, idempotency, amount checks, no card storage |
| Data Protection | [x] | IP hashing, deletion path, provider encryption posture |
| Dependencies | [x] | `bun audit` clean |
| Logging | [x] | Structured JSON, redaction, request correlation |
| Infrastructure | [x] | Provider controls documented for final go-live |

**Target:** Closed for Phase 25.2. Provider-side controls continue through Phase 25.6, 25.9, and 25.11 final go-live validation.
