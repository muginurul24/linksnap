# Tech Spec: Phase 15 Analytics Empty State

## Problem
The analytics page already avoids empty charts, but the empty-state copy and CTA do not match the Phase 15 UX requirement.

## Approach
Centralize the analytics empty-state content in a small exported constant and render it through the existing `EmptyState` component.

## Affected Files
- `src/app/(dashboard)/analytics/page.tsx`
- `tests/unit/analytics-empty-state.test.tsx`

## Acceptance Criteria
- [ ] Users with zero clicks see "No click data yet. Share your links to start seeing analytics."
- [ ] The empty-state CTA is "Copy a link".
- [ ] The CTA links to `/links`.
- [ ] Users with clicks still see analytics charts.

## Risks
- The empty state should only depend on `summary.totalClicks === 0`, not on missing breakdown arrays.
