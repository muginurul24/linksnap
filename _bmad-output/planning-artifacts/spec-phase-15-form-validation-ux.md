# Tech Spec: Phase 15 Form Validation UX

## Problem
Form validation is mostly submit-driven. Users should see field-level errors on blur, have those errors clear as soon as they type, and get password strength feedback when creating or changing passwords.

## Approach
Add small shared helpers for field-error normalization and password strength. Wire blur validation into auth, link, campaign, and settings forms while keeping submit validation on the existing Zod schemas.

## Affected Files
- `src/lib/forms/field-errors.ts`
- `src/lib/auth/password-strength.ts`
- `src/components/auth/password-strength-indicator.tsx`
- `src/app/(marketing)/*/*-form.tsx`
- `src/app/(dashboard)/links/link-form.tsx`
- `src/app/(dashboard)/campaigns/campaign-form.tsx`
- `src/app/(dashboard)/settings/settings-forms.tsx`
- `tests/unit/form-validation-ux.test.tsx`

## Acceptance Criteria
- [x] Field errors appear after blur for invalid values.
- [x] Field errors clear when users type in that field.
- [x] Invalid fields expose `aria-invalid`.
- [x] Link destination URL and campaign slug show helpful field errors.
- [x] New-password auth flows show Weak, Fair, or Strong strength feedback.

## Risks
- Cross-field password confirmation can show stale errors if only one field is revalidated.
- Edit forms use optional update schemas; field-level validation must still reflect UI-required fields where appropriate.
