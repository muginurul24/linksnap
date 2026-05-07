# Task 12.17 Spec — Analytics Dashboard Real Data

## Goal
Replace empty mock analytics arrays with authenticated, owner-scoped click event
analytics for the dashboard.

## Scope
- Convert `src/app/(dashboard)/analytics/page.tsx` to an async server component.
- Add a client chart component for Recharts rendering.
- Query owned click events for 7/30/90 day and custom date ranges.
- Show daily clicks, device breakdown, top referrers, and top countries.
- Add CSV export generated from the same server-side summary.
- Add `GET /api/v1/analytics` for integration coverage of the dashboard analytics query.

## Decisions
- Dashboard analytics supports a 90-day max range, separate from the existing per-link API's 30-day limit.
- CTA click events are excluded from total clicks/trend counts by the existing summary logic, matching current Link Page analytics semantics.
- The page uses query params (`range`, `from`, `to`) so range controls are shareable and server-rendered.
- CSV export is a data URL generated from the server summary to avoid adding a mutating or stateful export endpoint.

## Security
- Dashboard and API analytics require authentication.
- Click event reads are scoped through owned links.
- The API route is rate limited by user plan.
- Query params are validated with Zod and range helper checks.
