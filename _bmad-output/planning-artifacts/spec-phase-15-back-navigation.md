# Tech Spec: Phase 15 Back Navigation

## Problem
Create/edit pages use inconsistent outline buttons for back navigation. The Phase 15 UX audit asks for a consistent small text link above each page title.

## Approach
Create a small dashboard `BackNavigationLink` component and use it on link and campaign create/edit pages. Keep the page titles and descriptions unchanged.

## Affected Files
- `src/components/dashboard/back-navigation-link.tsx`
- `src/app/(dashboard)/links/new/page.tsx`
- `src/app/(dashboard)/links/[slug]/edit/page.tsx`
- `src/app/(dashboard)/campaigns/new/page.tsx`
- `src/app/(dashboard)/campaigns/[id]/edit/page.tsx`
- `tests/unit/back-navigation-link.test.tsx`

## Acceptance Criteria
- [x] Links create/edit pages render "Back to Links" linking to `/links`.
- [x] Campaigns create/edit pages render "Back to Campaigns" linking to `/campaigns`.
- [x] Back navigation is a small text link above the page title.

## Risks
- Back navigation should not change existing auth, ownership, or form behavior.
