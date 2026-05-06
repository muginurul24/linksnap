# Tech Spec: Click Logging

## Problem
Redirect clicks need analytics metadata without storing plaintext visitor IPs.

## Approach
Keep redirect request handling fast by reading headers before `after()`, then pass plain metadata to the async click logger. Hash IPs with SHA-256 and an environment salt before persistence, parse user-agent locally, and resolve geo with MaxMind GeoLite2 when `MAXMIND_DB_PATH` is configured. Fall back to trusted edge geo headers when a local database is unavailable.

## Affected Files
- `src/app/[slug]/page.tsx`
- `src/lib/analytics/click-logger.ts`
- `src/lib/analytics/*`
- `src/lib/geo/*`
- `tests/unit/*`

## Acceptance Criteria
- [x] No plaintext IP stored in PostgreSQL.
- [x] Click events include IP hash, country, city, referrer, user agent, device, browser, and OS where available.
- [x] Missing MaxMind database does not break redirects.
- [x] Unit tests cover hashing, metadata parsing, and database insert behavior.

## Risks
- MaxMind requires an external `.mmdb` file and regular updates; local development may only use edge-header fallback.
- Serverless deployments should prefer direct async insert or Redis/Cron queueing over in-memory batching.
