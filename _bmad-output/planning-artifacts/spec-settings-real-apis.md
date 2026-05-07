# Tech Spec: Settings Real APIs

## Problem
Settings tabs still contain inert controls and hardcoded account values. Users
need real profile updates, password changes, and notification preference
persistence through authenticated APIs.

## Approach
Add a typed notifications JSON column on `users`, settings query helpers, Zod
validation schemas, and three authenticated endpoints:
`PATCH /api/v1/settings/profile`, `PATCH /api/v1/settings/notifications`, and
`POST /api/v1/auth/change-password`. Convert the settings tab content into
client forms that submit to those APIs with the existing browser mutation
header.

## Affected Files
- `src/lib/db/schema.ts`
- `src/lib/db/queries/settings.ts`
- `src/lib/validations/auth.ts`
- `src/lib/validations/settings.ts`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/settings-forms.tsx`
- `src/app/api/v1/settings/profile/route.ts`
- `src/app/api/v1/settings/notifications/route.ts`
- `src/app/api/v1/auth/change-password/route.ts`
- Focused unit and integration tests

## Acceptance Criteria
- [ ] Profile tab loads real session user data and saves name changes.
- [ ] Security tab verifies current password and stores a new password hash.
- [ ] Notifications tab persists typed user preferences.
- [ ] All new inputs are validated with Zod and unknown fields are rejected.
- [ ] Routes require a session, rate limit mutations, and use standard envelopes.
- [ ] Existing hardcoded `Rafi` / `rafi@email.com` settings values are gone.

## Risks
- Users created through OAuth may not have a password hash; change-password must
  fail with a clear safe error instead of silently setting a password.
- Adding a non-null JSON default should be a static default to avoid expensive
  table rewrites.
