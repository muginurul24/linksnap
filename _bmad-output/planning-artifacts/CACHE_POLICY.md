# LinkSnap Cache Policy

**Status:** Approved for Phase 22.6  
**Owner:** Platform / Security / Analytics  
**Source of truth in code:** `src/lib/cache/policy.ts`

## Principles

- Every cache entry must have an explicit TTL.
- Redis cache is best-effort: failures must be logged where actionable and must not break user flows.
- Cache keys must be tenant-scoped and built from normalized identifiers, never unsanitized free-form input.
- Caches may speed up reads, but they must not decide authentication, authorization, CSRF/origin trust, payment mutation state, or webhook validity.
- Raw analytics event lists are not cacheable. Aggregates may be cached only when scoped, short-lived, and invalidated by writes.

## Approved Caches

| Domain | Storage | Key Pattern | TTL | Tenant Scope | Invalidation | Stale Tolerance |
|---|---:|---|---:|---|---|---|
| Redirect metadata | Redis | `linksnap:redirect:{slug}` | 300s | Public slug metadata only | Link create/update/delete, Link Page changes, Smart Rules changes, schedule/expiry/status changes | Up to 300s only for unchanged links |
| Redirect click count snapshot | Redis | `linksnap:redirect-click-count:{linkId}` | 60s | Single link owner | Increment on counted click events, TTL refresh | Display-only, up to 60s |
| Smart Rules | Redis | `linksnap:smart-rules:{slug}` | 300s | Public slug rule set | Rule replace/delete, link destination changes | Up to 300s only for unchanged rules |
| QR render payload | Redis + HTTP | `linksnap:qr:{slug}:{format}:{size}` | 86400s | Public slug and render params | Link destination/availability changes, otherwise TTL | Up to 24h when link availability is unchanged |
| GeoIP lookup | Redis | `linksnap:geo:{publicIpAddress}` | 86400s | Public IP lookup result only | TTL only; MaxMind refresh ages out old values | Up to 24h for analytics enrichment |
| Dashboard subscription snapshot | Redis | `linksnap:dashboard:subscription:{userId}` | 60s | Single authenticated user | Profile update, subscription renewal, payment settlement, admin plan override | Up to 60s; not used for payment mutation authorization |
| Dashboard analytics aggregates | Redis | `linksnap:analytics:dashboard:{userId}:{from}:{to}:u{userVersion}:g{globalVersion}:v1` | 60s | Single authenticated user | Link/Page/Rule mutations bump user version; click queue processing bumps global version | Up to 60s |
| Admin analytics aggregates | Redis | `linksnap:analytics:admin:window-{days}:{utcDay}:v{version}:v1` | 30s | Superadmin aggregate data only | Admin plan override, subscription/payment settlement, click queue processing | Up to 30s |
| Public marketing content | HTTP/CDN | `HTTP:{path}:{locale}` | 3600s | Public, no user data | Redeploy or path revalidation | Up to 1h |

## Redis As Ephemeral State, Not Cache

| Domain | Key Pattern | TTL | Notes |
|---|---|---:|---|
| Rate limits | `rate-limit:{domain}:{subject}` | Request window | Security control state, not a reusable response cache |
| 2FA challenges | `linksnap:auth:2fa:challenge:{challengeId}` | 300s | Challenge secret material is short-lived and deleted after use |
| Pending email changes | `linksnap:auth:change-email:{userId}` | 600s | Pending OTP state, deleted after verification/cancel |
| Click queue | `linksnap:click-events:redirect` | 3600s | Write-behind queue; dead-letter entries live up to 7 days |

## Do Not Cache

| Domain | Reason |
|---|---|
| Auth sessions | Must be validated through Auth.js and current database state |
| Superadmin authorization checks | Must be revalidated against the database |
| CSRF/origin decisions | Must be evaluated per request |
| Password/reset secrets | Stored as one-way hashes with explicit expiry, never cached |
| API key plaintext | Plaintext exists only at creation time |
| Payment create/mutation results | Must be fresh, idempotent, provider-confirmed, and never reused across channel/payment method attempts |
| Webhook verification outcomes | Signatures and outcomes must be verified per request |
| Admin mutation results | Must be strongly consistent and auditable |
| Raw analytics event lists | Can include PII-heavy metadata; only scoped aggregates are cacheable |

## Implementation Rules

- Approved Redis cache helpers must use the TTLs in `src/lib/cache/policy.ts`.
- New cache helpers must be added to this document and to `src/lib/cache/policy.ts` in the same change.
- Invalidations must happen in the write path before a task is marked complete.
- Analytics aggregate caches must be keyed by scoped identifiers and normalized date windows only.
- Payment, admin, auth, and security decisions must prefer correctness over latency and stay uncached.
- Payment mutation endpoints (`/api/v1/payments/create`, subscription cancel/reactivate/renew, and PayGate webhook processing) must not read mutation outcomes from Redis. Redis may only be used for rate limiting and post-settlement invalidation signals.

## Test Requirements

- Unit tests must assert approved cache TTLs match the runtime constants.
- Unit tests must assert sensitive domains do not gain `*cache*` helpers.
- Integration tests for cache helpers must cover hit, miss, invalidation, and Redis failure fallback before those helpers are wired into production paths.
