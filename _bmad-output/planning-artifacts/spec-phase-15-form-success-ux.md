# Tech Spec: Phase 15 Form Submit Success UX

## Problem
Success feedback is inconsistent across forms. Link edit redirects away even when users may want to keep editing, and settings success copy does not match the Phase 15 UX audit.

## Approach
Centralize form success feedback decisions in small exported helpers/constants. Keep link create redirecting to `/links`, keep link edit on the edit page, keep campaign create/edit redirecting to `/campaigns`, and update settings toast copy.

## Affected Files
- `src/app/(dashboard)/links/link-form.tsx`
- `src/app/(dashboard)/campaigns/campaign-form.tsx`
- `src/app/(dashboard)/settings/settings-forms.tsx`
- `tests/unit/form-success-feedback.test.ts`

## Acceptance Criteria
- [ ] Link create shows "Link created" and redirects to `/links`.
- [ ] Link edit shows "Link updated" and stays on the current edit page.
- [ ] Campaign create/edit show success toasts and redirect to `/campaigns`.
- [ ] Settings profile, password, and notification saves use the requested success copy.

## Risks
- Edit-link refresh should not become an accidental navigation away from the current page.
