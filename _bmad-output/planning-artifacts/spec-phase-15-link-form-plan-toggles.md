# Tech Spec: Phase 15 Link Form Plan Toggles

## Problem
Free users can interact with Link Page and Smart Rules toggles in the link form even though those features require an upgraded plan.

## Approach
Pass the current user plan from the create/edit link pages into `CreateLinkForm`. Disable the Link Page and Smart Rules toggles for Free users with clear hover/inline copy, while preserving normal behavior for Pro and Business users.

## Affected Files
- `src/app/(dashboard)/links/link-form.tsx`
- `src/app/(dashboard)/links/new/page.tsx`
- `src/app/(dashboard)/links/[slug]/edit/page.tsx`
- `tests/unit/link-form-plan-gates.test.tsx`

## Acceptance Criteria
- [ ] Free users see disabled Link Page and Smart Rules toggles.
- [ ] Free-user toggles expose the required upgrade reason.
- [ ] Pro and Business users can use both toggles normally.
- [ ] Create and edit pages pass `userPlan` into `CreateLinkForm`.

## Risks
- Existing Free users with previously enabled gated data may still need to view saved data without being able to toggle it.
- API-side plan checks must remain authoritative; this is UX hardening only.
