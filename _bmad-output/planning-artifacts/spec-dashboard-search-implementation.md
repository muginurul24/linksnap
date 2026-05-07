# Tech Spec: Dashboard Search Implementation

## Problem
The dashboard header includes a search input, but it only filters links after a
manual form submit. Task 12.22 requires the header search to drive the existing
`/links?search=` filter with a 300ms debounce.

## Approach
Reuse the existing links search helper so the header only navigates to internal
`/links` URLs. Keep filtering on the server through the existing links page and
Drizzle query path. Add a small unit-tested navigation comparison helper and a
shared debounce constant.

## Affected Files
- `src/components/dashboard/app-header.tsx`
- `src/lib/links/search.ts`
- `tests/unit/dashboard-app-header.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] Header search navigates to `/links?search=query` after 300ms of input idle time.
- [x] Clearing search while already on `/links` navigates back to `/links`.
- [x] Search URLs are built through the existing sanitized helper.
- [x] Unit coverage verifies search query building and navigation comparison.

## Risks
- Debounced navigation could create noisy browser history entries if every input
  change pushes a new entry. Use replacement navigation for debounced updates and
  keep submit as an explicit push.
- Reading current query state in a shared header should avoid static rendering
  pitfalls, so the header does not add `useSearchParams`.
