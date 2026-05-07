# Tech Spec: Phase 15 Sidebar Upgrade Card

## Problem
The sidebar shows the "Upgrade to Pro" card for every user, including Pro and Business accounts that have already upgraded.

## Approach
Expose a small sidebar visibility helper and render the upgrade card only for Free users. Keep the existing card design unchanged for Free users.

## Affected Files
- `src/components/dashboard/app-sidebar.tsx`
- `tests/unit/app-sidebar.test.ts`

## Acceptance Criteria
- [x] Free users see the sidebar upgrade card.
- [x] Pro users do not see the sidebar upgrade card.
- [x] Business users do not see the sidebar upgrade card.
- [x] Existing sidebar plan labels and navigation behavior remain unchanged.

## Risks
- Removing only the card content but not its wrapper would leave empty sidebar spacing for paid users.
