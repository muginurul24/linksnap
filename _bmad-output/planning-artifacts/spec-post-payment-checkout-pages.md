# Tech Spec: Post-Payment Checkout Pages

> **Note:** This spec was originally written for direct Midtrans Snap integration and later updated to reflect the PayGate gateway that LinkSnap actually uses. PayGate (Rafi's custom gateway) wraps Midtrans Core API.

## Problem
Users returning from payment checkout need clear success and cancellation
pages. The create-payment flow also needs deterministic checkout return URLs so
PayGate redirects customers back to LinkSnap after payment.

## Approach
- Add authenticated success and public cancellation pages under `/checkout`.
- Validate `order_id` query input before reading checkout details.
- Read success details through an owner-scoped payment query.
- Generate success, error, and unfinish URLs from `APP_URL`,
  `NEXT_PUBLIC_APP_URL`, or the request origin.
- Send the PayGate `callback_url` field. Error and unfinish URLs are generated
  for PayGate configuration.

## Affected Files
- `src/app/(marketing)/checkout/success/page.tsx`
- `src/app/(marketing)/checkout/cancel/page.tsx`
- `src/app/api/v1/payments/create/route.ts`
- `src/lib/db/queries/payments.ts`
- `src/lib/payments/paygate.ts`
- `src/lib/payments/redirects.ts`
- `src/lib/validations/payment.ts`
- `tests/unit/checkout-pages.test.tsx`
- `tests/unit/paygate-client.test.ts`
- `tests/unit/payment-redirects.test.ts`
- `tests/integration/create-payment-api.test.ts`

## Acceptance Criteria
- [x] `/checkout/success?order_id=...` renders plan and next billing status for
      the authenticated owner.
- [x] `/checkout/cancel` renders a cancellation state with a retry link.
- [x] Create-payment requests pass deterministic checkout return URLs into the
      PayGate charge payload.
- [x] The PayGate payload includes the `callback_url` field.
- [x] Unit and integration tests cover checkout rendering and callback URL
      generation.

## Risks
- PayGate callbacks are not the payment source of truth; the webhook remains
  authoritative for subscription activation.
- Error and unfinish redirect URLs should also be configured in PayGate
  settings.
