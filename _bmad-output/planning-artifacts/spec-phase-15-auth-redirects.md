# Tech Spec: Phase 15 Auth Page Redirects

## Problem
Authenticated users can still open login, register, forgot-password, reset-password, and verify pages. This creates confusing loops and lets already signed-in users interact with flows they no longer need.

## Approach
Add server-side guards to the marketing auth pages. Pages that are not useful for authenticated users redirect any active session to `/dashboard`; the verify page redirects only when the signed-in user is already email verified.

## Affected Files
- `src/app/(marketing)/login/page.tsx`
- `src/app/(marketing)/register/page.tsx`
- `src/app/(marketing)/verify/page.tsx`
- `src/app/(marketing)/forgot-password/page.tsx`
- `src/app/(marketing)/reset-password/page.tsx`
- `src/lib/db/queries/users.ts`
- `tests/unit/auth-page-redirects.test.tsx`

## Acceptance Criteria
- [ ] Logged-in users are redirected from login, register, forgot-password, and reset-password to `/dashboard`.
- [ ] Verified logged-in users are redirected from verify to `/dashboard`.
- [ ] Unverified logged-in users can still access verify.
- [ ] Anonymous users can still access all auth pages.

## Risks
- Redirects must stay server-side so client auth forms do not briefly flash.
- Verify page must not block users who still need to complete OTP verification.
