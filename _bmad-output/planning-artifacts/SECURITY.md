# LinkSnap — Security Implementation Checklist

> **CRITICAL:** Every task in this document is MANDATORY before production deployment.
> Codex must verify each item and log results in JOURNAL.md.

---

## 🛡️ OWASP Top 10 Coverage

### SEC-01: Broken Access Control
- [x] **Middleware auth gate** — Dashboard surfaces protected via `src/proxy.ts`; public auth/static routes excluded. Future user-data `/api/v1/*` routes still need per-route auth/ownership.
- [x] **Ownership verification** — User-data API routes implemented so far verify `session.user.id === resource.userId`; future user-data routes must continue this pattern.
- [ ] **Role-based access** — Admin routes (`/api/v1/admin/*`) check `session.user.role === "admin"`
- [ ] **Plan-gated features** — Link Page and Smart Rules quotas are enforced by plan; broader API-access plan gates still pending.
- [x] **IDOR prevention** — Link item routes use UUID params and explicit ownership checks before returning, updating, or deleting.
- [x] **Direct object reference test** — `tests/integration/link-item-api.test.ts` verifies another user's `/api/v1/links/{id}` returns 403.

### SEC-02: Cryptographic Failures
- [x] **Password hashing** — bcryptjs with cost factor ≥ 12 (implemented in `src/app/api/v1/auth/register/route.ts`)
- [x] **JWT secret** — `AUTH_SECRET` ≥ 32 characters, generated via `openssl rand -base64 32`
- [ ] **TLS everywhere** — Force HTTPS in production via Vercel + Cloudflare
- [ ] **Sensitive data encryption** — API keys, tokens stored hashed (not plaintext)
- [x] **IP hashing** — Analytics hashes IPs with SHA256(IP + `IP_HASH_SALT`) before persistence.
- [ ] **No hardcoded secrets** — Verify zero secrets in source code: `rtk grep -r "sk-|api_key|secret|password" src/ --include="*.ts" --include="*.tsx"`

### SEC-03: Injection Attacks

#### SQL Injection
- [x] **Drizzle ORM all queries** — Zero raw SQL in codebase verified on 2026-05-07 with `rtk proxy rg -n 'sql\`|db\.execute|\.execute\(|raw\(' src --glob '*.{ts,tsx}'`
  ```bash
  rtk grep -r "sql\`" src/ --include="*.ts" | grep -v "drizzle"
  # Should return nothing
  ```
- [x] **Parameterized queries** — Verified no raw SQL execution or template SQL query construction in source code on 2026-05-07.
- [x] **No string concatenation** in query building — Verified no raw SQL/string-built query execution in source code on 2026-05-07.
- [ ] **Database user permissions** — App DB user has minimum required privileges (no DROP, no ALTER)

#### NoSQL Injection (if any)
- [ ] N/A — Using PostgreSQL only. No MongoDB.

#### Command Injection
- [x] **No `exec()`/`spawn()` with user input** — Verified on 2026-05-07; only `.exec()` match was safe RegExp usage in `src/lib/rules/rule-engine.ts`.
  ```bash
  rtk grep -r "exec\|spawn\|child_process" src/
  # Should return nothing
  ```

### SEC-04: Cross-Site Scripting (XSS)
- [x] **React auto-escaping** — User content is rendered through JSX; chart style text is generated from sanitized identifiers/color values.
- [x] **No `dangerouslySetInnerHTML`** without sanitization
  ```bash
  rtk grep -r "dangerouslySetInnerHTML" src/
  # Must be zero, or documented with DOMPurify sanitization
  ```
- [x] **Link Page content** — Public redirect renderer displays user-provided brandName, title, description, CTA text, social proof, and image URLs through JSX escaping; dynamic CTA color is validated as a hex value before rendering.
- [x] **URL validation** — All user-submitted URLs validated with Zod `.url()` plus protocol/internal-host checks before storage.
- [ ] **SVG sanitization** — If accepting SVG uploads for logos, sanitize with DOMPurify
- [x] **Content-Security-Policy header** — Implemented in `next.config.ts`:
  ```typescript
  // See src/lib/security/headers.ts
  `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';`
  ```

### SEC-05: Cross-Site Request Forgery (CSRF / XSRF)
- [x] **NextAuth CSRF protection** — Built-in via NextAuth.js (double-submit cookie pattern)
- [ ] **SameSite cookies** — JWT cookies set with `SameSite=Strict` (verify in auth config)
- [ ] **State-changing operations** — All POST/PATCH/DELETE require valid session
- [x] **Origin/Referer header check** — Proxy validates `Origin` on mutating `/api/v1/*` requests:
  ```typescript
  // In src/proxy.ts via validateApiMutationRequest()
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return new Response("Forbidden", { status: 403 });
  }
  ```
- [x] **Custom header requirement** — Proxy enforces `X-Requested-With: XMLHttpRequest` on mutating `/api/v1/*` requests, with PayGate webhook exempted for server-to-server callbacks. PayGate is LinkSnap's own payment gateway built on top of Midtrans Core API.

### SEC-06: Security Misconfiguration
- [x] **Security headers** — All implemented in `next.config.ts`:
  - [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - [x] `X-Content-Type-Options: nosniff`
  - [x] `X-Frame-Options: DENY`
  - [x] `Referrer-Policy: strict-origin-when-cross-origin`
  - [x] `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - [x] `Content-Security-Policy` (see SEC-04)
- [ ] **No verbose errors** — Production errors return generic messages, not stack traces
- [ ] **No directory listing** — Vercel/Next.js prevents by default
- [ ] **CORS configuration** — Only allow `app.linksnap.id` and `linksnap.id` origins
- [x] **Environment variables** — `.env` in `.gitignore`; `.env.example` committed without values

### SEC-07: DDoS Protection & Rate Limiting

#### Rate Limiting
- [ ] **Global rate limit** — 100 requests/15min per IP (Redis sliding window)
- [x] **Auth endpoints** — 5 login attempts/15min per IP
- [x] **Register endpoint** — 3 registrations/hour per IP
- [x] **OTP resend** — 3 OTPs/hour per email
- [x] **Email verification** — 10 OTP verification attempts/15min per email.
- [x] **Link creation** — Tier-based (Free: 10/min, Pro: 30/min, Business: 60/min) implemented in `src/app/api/v1/links/route.ts`
- [x] **API endpoints** — Tier-based (Free: 30/min, Pro: 60/min, Business: 120/min) implemented for Link list/item/analytics/slug/Link Page/Smart Rules endpoints; future user-data APIs must continue this pattern.
- [ ] **Redirect endpoint** — 1000 requests/min per IP (abuse prevention)

#### DDoS Mitigation
- [ ] **Cloudflare proxy** — All traffic through Cloudflare (DDoS protection layer 3/4)
- [ ] **Cloudflare WAF** — Rate limiting rules at edge
- [ ] **Vercel DDoS protection** — Built-in for platform layer
- [ ] **Bot detection** — Cloudflare Bot Management enabled
- [ ] **Challenge page** — Suspicious traffic gets JS challenge or CAPTCHA

#### Resource Protection
- [ ] **Database connection pooling** — Neon.tech connection limit configured
- [ ] **Redis connection pooling** — Upstash connection limit configured  
- [ ] **Request timeout** — API routes timeout at 10 seconds
- [ ] **Payload size limit** — Max request body 1MB (configured in `next.config.ts`)
- [x] **Query complexity limit** — Link analytics API validates and caps query ranges to 30 days.

### SEC-08: N+1 Problem Prevention
- [ ] **Drizzle Relations** — Use Drizzle's `.relations` and `.findMany({ with: {...} })` for eager loading
  ```typescript
  // ❌ N+1
  for (const link of links) {
    const clicks = await db.select().from(clickEvents).where(eq(clickEvents.linkId, link.id));
  }
  
  // ✅ Batch
  const linkIds = links.map(l => l.id);
  const allClicks = await db.select().from(clickEvents).where(inArray(clickEvents.linkId, linkIds));
  ```
- [ ] **Campaign analytics** — Single query with `GROUP BY` instead of per-link queries
- [ ] **Dashboard overview** — Batch queries: one for links, one for clicks, one for campaigns
- [ ] **DB query audit** — Run before production:
  ```bash
  rtk grep -r "for.*links\|forEach.*await\|map.*await" src/ --include="*.ts"
  # Investigate every match for potential N+1
  ```

### SEC-09: Input Validation & Sanitization
- [x] **Zod schemas** on ALL API inputs implemented so far (auth API routes, link create/update bodies, link list query, link item params, link slug availability params, Link Page body, Smart Rules batch/delete inputs); future API routes must continue this pattern.
- [x] **Slug validation** — `/^[a-z0-9-]{3,50}$/` for create-link input, slug availability params, and public redirect params (no special chars, no Unicode tricks)
- [x] **URL validation** — Link create/update inputs use Zod `.url()` with additional checks:
  - Reject `javascript:` protocol
  - Reject `data:` protocol
  - Reject `file:` protocol
  - Reject localhost/127.0.0.1/internal IPs
- [x] **Email validation** — Zod `.email()` + Resend verification
- [x] **String length limits** — Auth text fields have max lengths in both Zod schema AND database schema; future feature fields must continue this pattern.
- [x] **Unknown field stripping** — Auth schemas use Zod `.strict()` to reject extra fields.
- [x] **Null/undefined handling** — Auth API routes handle missing/invalid JSON bodies gracefully.

### SEC-10: SSRF Prevention
- [x] **URL destination validation** — Link create/update inputs reject internal URLs:
  ```typescript
  function isValidDestination(url: string): boolean {
    const parsed = new URL(url);
    const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "172.16.", "192.168."];
    return !blocked.some(b => parsed.hostname.startsWith(b) || parsed.hostname === b);
  }
  ```
- [x] **Webhook validation** — PayGate webhooks verified via HMAC-SHA256 signature with timing-safe comparison before processing. All payment data flows through PayGate only — no direct Midtrans integration.
- [ ] **No user-controlled fetch URLs** — Verify no user input flows into `fetch()` calls
  ```bash
  rtk grep -r "fetch(req\|fetch(body\|fetch(params" src/
  # Should return nothing
  ```

---

## 🔐 Additional Security Hardening

### SEC-11: Authentication Security
- [ ] **Account lockout** — 5 failed login attempts → 15-minute lockout
- [x] **Password policy** — Minimum 8 characters, at least 1 letter + 1 number
- [ ] **Session timeout** — JWT access token expires in 15 minutes
- [ ] **Refresh token rotation** — Each refresh issues new token, invalidates old
- [ ] **Concurrent session limit** — Max 5 active sessions per user
- [ ] **Suspicious activity detection** — Alert on login from new IP/location

### SEC-12: Payment Security
- [x] **PayGate signature verification** — HMAC-SHA256 on every webhook
- [ ] **Amount validation server-side** — Never trust client-submitted amounts
- [ ] **Idempotent webhooks** — Check `orderId` before processing
- [ ] **No card data storage** — PayGate handles payment provider handoff; LinkSnap stores no card data
- [ ] **Webhook IP allowlist** — Restrict callbacks to PayGate infrastructure where supported

### SEC-13: Data Protection
- [ ] **GDPR compliance** — Users can request data export/deletion
- [ ] **Data retention policy** — Analytics data purged after plan-specific period
- [x] **IP anonymization** — Redirect click logging hashes IPs immediately and never stores plaintext IPs.
- [ ] **PII minimization** — Only collect essential user data
- [ ] **Encryption at rest** — Neon.tech encrypts data at rest by default
- [ ] **Encryption in transit** — TLS 1.3 everywhere

### SEC-14: Dependency Security
- [ ] **Regular audits** — Run weekly:
  ```bash
  rtk bun audit
  ```
- [ ] **Dependabot/Renovate** — Automated dependency updates on GitHub
- [ ] **Lockfile committed** — `bun.lock` in version control
- [ ] **No deprecated packages** — Check quarterly
- [ ] **Minimal dependencies** — Audit new deps before adding

### SEC-15: Logging & Monitoring
- [ ] **Security events logged** — Failed logins, rate limit hits, webhook failures
- [ ] **Structured logging** — JSON format with `requestId` correlation
- [ ] **No sensitive data in logs** — Strip passwords, tokens, credit card data
- [ ] **Alert thresholds** — Error rate ≥1%, webhook failure ≥3 consecutive, unusual traffic spike
- [ ] **Audit trail** — All admin actions logged with user ID + timestamp

### SEC-16: Infrastructure Security
- [ ] **Cloudflare WAF rules** — SQL injection, XSS, file inclusion patterns
- [ ] **Cloudflare Bot Fight Mode** — Automatic bot mitigation
- [ ] **Vercel secure environment variables** — All env vars set via Vercel dashboard (encrypted)
- [ ] **Database IP allowlist** — Neon.tech limited to Vercel IPs + developer IPs
- [ ] **Redis ACL** — Upstash with restricted commands

---

## 🔍 Security Testing Checklist

### Pre-Deployment
- [ ] Run OWASP ZAP scan against staging environment
- [ ] Manual penetration test of auth flow
- [ ] Test all rate limits with `wrk` or `k6`
- [ ] Verify CSP header blocks inline scripts
- [ ] Test with malicious URLs (XSS payloads in slug)
- [ ] Test with extremely long inputs (buffer overflow style)
- [ ] Verify all error responses are generic (no stack traces)
- [ ] Test concurrent request handling (race conditions)

### Code-Level Verification Commands
```bash
# Check for raw SQL
rtk grep -rn "sql\`" src/ --include="*.ts" | grep -v drizzle

# Check for dangerous HTML
rtk grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx"

# Check for hardcoded secrets
rtk grep -rn "sk-\|api_key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env\|.example\|AUTH_SECRET\|RESEND_API_KEY"

# Check for N+1 patterns
rtk grep -rn "for.*await\|forEach.*await\|map.*await" src/ --include="*.ts"

# Check for missing input validation
rtk grep -rn "req.json()\|req.body" src/app/api/ --include="*.ts" | grep -v "parsed\|safeParse\|zod"

# Check for eval/exec
rtk grep -rn "eval(\|Function(\|exec(\|spawn(" src/ --include="*.ts"
```

---

## 📊 Security Scorecard

| Category | Status | Notes |
|---|---|---|
| Access Control | [ ] | Middleware + ownership + RBAC |
| Cryptography | [ ] | bcrypt ≥12 + JWT + TLS |
| Injection | [ ] | Drizzle ORM + input validation |
| XSS | [ ] | React escaping + CSP |
| CSRF | [ ] | NextAuth + SameSite + Origin check |
| Misconfiguration | [ ] | Security headers + CORS + no stack traces |
| DDoS / Rate Limiting | [ ] | 7 rate limit tiers + Cloudflare |
| N+1 Prevention | [ ] | Batch queries + audit |
| Input Validation | [ ] | Zod on all endpoints + URL sanitization |
| SSRF | [ ] | Destination URL validation |
| Auth Security | [ ] | Lockout + rotation + session management |
| Payment Security | [ ] | Signature verification + idempotency |
| Data Protection | [ ] | GDPR + retention + anonymization |
| Dependencies | [ ] | Audit + auto-updates |
| Logging | [ ] | Structured + no PII + alerts |
| Infrastructure | [ ] | WAF + bot protection + IP allowlist |

**Target: 100% before production. Zero exceptions.**
