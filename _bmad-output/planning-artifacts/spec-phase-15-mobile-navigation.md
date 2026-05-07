# Tech Spec: Phase 15 Mobile Navigation Polish

## Problem
Mobile dashboard navigation still carries desktop assumptions: breadcrumb trails can be too long, the sidebar mobile default is implicit, and dense tables/cards need clearer mobile-first classes.

## Approach
Hide parent breadcrumbs below `md`, make the mobile sidebar default explicit, hide nonessential links-table columns on small screens, and make billing plan cards use explicit mobile-first grid classes.

## Affected Files
- `src/components/dashboard/app-header.tsx`
- `src/components/ui/sidebar.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/links/page.tsx`
- `src/app/(dashboard)/settings/billing/page.tsx`
- `tests/unit/dashboard-app-header.test.ts`
- `tests/unit/mobile-navigation-polish.test.ts`

## Acceptance Criteria
- [ ] Mobile breadcrumbs show only the current page.
- [ ] Sidebar mobile open state defaults to closed explicitly.
- [ ] Links table hides nonessential columns on mobile.
- [ ] Billing plan cards stack vertically on mobile.

## Risks
- Desktop breadcrumb and sidebar behavior should remain unchanged.
