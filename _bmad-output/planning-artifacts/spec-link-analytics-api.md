# Tech Spec: Link Analytics API

## Problem
Link owners need an authenticated endpoint that returns click analytics for one link without exposing other users' data or allowing expensive unbounded queries.

## Approach
Add `GET /api/v1/links/[id]/analytics` with UUID and date-range validation, session auth, ownership checks, tiered API rate limiting, and one bounded click-event query. Aggregate click totals, unique IP hashes, daily counts, top locations/referrers, and device/browser breakdowns in TypeScript to avoid raw SQL.

## Affected Files
- `src/app/api/v1/links/[id]/analytics/route.ts`
- `src/lib/db/queries/click-events.ts`
- `src/lib/analytics/summary.ts`
- `src/lib/validations/link.ts`
- `tests/integration/link-analytics-api.test.ts`
- `tests/unit/analytics-summary.test.ts`

## Acceptance Criteria
- [x] Authenticated owners can fetch analytics for their own link.
- [x] Another user's link returns `403 FORBIDDEN`.
- [x] Query params `from` and `to` are validated and capped to 30 days.
- [x] Response includes totals, unique clicks, clicks per day, top countries/cities/referrers, device breakdown, and browser breakdown.
- [x] No raw SQL or N+1 queries are introduced.

## Risks
- Aggregating in TypeScript is acceptable for the 30-day cap but may need database-side rollups or materialized summaries at scale.
