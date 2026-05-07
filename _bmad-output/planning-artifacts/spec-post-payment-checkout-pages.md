# Tech Spec: Post-Payment Checkout Pages

## Problem
Users who return from Midtrans Snap checkout need clear success and cancellation
pages. The create-payment flow also needs deterministic checkout return URLs so
Midtrans redirects customers back to LinkSnap after hosted checkout.

## Approach
- Add authenticated success and public cancellation pages under `/checkout`.
- Validate `order_id` query input before reading checkout details.
- Read success details through an owner-scoped payment query.
- Generate success, error, and unfinish URLs from `APP_URL`,
  `NEXT_PUBLIC_APP_URL`, or the request origin.
- Send the documented Midtrans Snap `callbacks.finish` payload value. Error and
  unfinish URLs are generated for Snap Preference/dashboard redirect
  configuration because Midtrans documents those as redirect settings, not Snap
  token request fields.

## Affected Files
- `src/app/(marketing)/checkout/success/page.tsx`
- `src/app/(marketing)/checkout/cancel/page.tsx`
- `src/app/api/v1/payments/create/route.ts`
- `src/lib/db/queries/payments.ts`
- `src/lib/payments/midtrans.ts`
- `src/lib/payments/redirects.ts`
- `src/lib/validations/payment.ts`
- `tests/unit/checkout-pages.test.tsx`
- `tests/unit/midtrans-client.test.ts`
- `tests/unit/payment-redirects.test.ts`
- `tests/integration/create-payment-api.test.ts`

## Acceptance Criteria
- [x] `/checkout/success?order_id=...` renders plan and next billing status for
      the authenticated owner.
- [x] `/checkout/cancel` renders a cancellation state with a retry link.
- [x] Create-payment requests pass deterministic checkout return URLs into the
      Midtrans Snap client.
- [x] The Snap payload includes the documented `callbacks.finish` override.
- [x] Unit and integration tests cover checkout rendering and callback URL
      generation.

## Risks
- Midtrans hosted checkout redirects are not the payment source of truth; the
  webhook remains authoritative for subscription activation.
- Error and unfinish redirect URLs still need to be configured in Midtrans Snap
  Preference when using hosted redirect flows.
