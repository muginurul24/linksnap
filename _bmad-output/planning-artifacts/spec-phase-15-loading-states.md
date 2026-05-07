# Tech Spec: Phase 15 Loading States

## Problem
Most interactive forms already disable submit buttons and show spinners, but some save buttons do not expose `aria-busy` and settings fields remain editable while saves are in flight.

## Approach
Add `aria-busy` to dashboard submit/save buttons and disable settings fields/switches during save requests. Keep existing auth and payment loading patterns unchanged because they already meet the requirement.

## Affected Files
- `src/app/(dashboard)/links/link-form.tsx`
- `src/app/(dashboard)/campaigns/campaign-form.tsx`
- `src/app/(dashboard)/settings/settings-forms.tsx`
- `tests/unit/form-loading-states.test.ts`

## Acceptance Criteria
- [ ] Link and campaign submit buttons expose busy state while submitting.
- [ ] Settings profile, notifications, and password saves expose busy state.
- [ ] Settings controls are disabled while their save request is running.
- [ ] Existing auth, billing, and create/edit forms keep spinner + disabled behavior.

## Risks
- Source-level regression tests are brittle, but they are scoped to the required loading-state snippets and avoid adding a new DOM test dependency.
