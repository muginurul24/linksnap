# Tech Spec: Phase 15 Delete Confirmations

## Problem
Some destructive actions either delete immediately or use inconsistent confirmation copy. Link list deletion is not wired to a confirmation flow.

## Approach
Create a shared delete confirmation dialog and use it for link list deletion, campaign deletion, API key revocation, and the existing edit-link delete action. The dialog uses the required title and irreversible-action copy.

## Affected Files
- `src/components/dashboard/delete-confirmation-dialog.tsx`
- `src/app/(dashboard)/links/link-actions.tsx`
- `src/app/(dashboard)/links/page.tsx`
- `src/app/(dashboard)/links/link-form.tsx`
- `src/app/(dashboard)/campaigns/campaign-actions.tsx`
- `src/app/(dashboard)/settings/api-keys-panel.tsx`
- `tests/unit/delete-confirmation-dialog.test.tsx`

## Acceptance Criteria
- [ ] Link list delete opens a confirmation dialog before calling DELETE.
- [ ] Campaign delete opens a confirmation dialog with the campaign name.
- [ ] API key revoke opens a confirmation dialog with the key name.
- [ ] Dialog copy includes "This action cannot be undone."
- [ ] Confirm invokes the supplied destructive callback; Cancel closes the dialog.

## Risks
- Client-side confirmation must not replace API ownership checks.
- Dropdown menu actions should remain keyboard accessible.
