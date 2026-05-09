# Tech Spec: PayGate Payment Redirect URL Configuration

> **Note:** This spec was originally written for direct Midtrans Snap integration and later updated to reflect the PayGate gateway that LinkSnap actually uses. PayGate (Rafi's custom gateway) wraps Midtrans Core API.

## Problem
Payment checkout needs deterministic return URLs on the production domain so users return to LinkSnap after completing, cancelling, or failing payment.

## Approach
- Use the existing `buildPaymentRedirectUrls` helper to derive finish, error,
  and unfinish URLs from `APP_URL`, `NEXT_PUBLIC_APP_URL`, or request origin.
- Pass those URLs from `src/app/api/v1/payments/create/route.ts` into
  `createPayGateCharge`.
- Keep the PayGate API payload `callback_url` field and PayGate configuration
  settings for error/unfinish redirects.
- Verify production-domain URL generation with existing integration and unit
  tests.

## Affected Files
- `src/app/api/v1/payments/create/route.ts`
- `src/lib/payments/redirects.ts`
- `src/lib/payments/paygate.ts`
- `tests/integration/create-payment-api.test.ts`
- `tests/unit/payment-redirects.test.ts`
- `tests/unit/paygate-client.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] Payment creation generates `/checkout/success?order_id=...` finish URLs.
- [x] Payment creation generates `/checkout/cancel?...status=error` URLs.
- [x] Payment creation generates `/checkout/cancel?...status=unfinish` URLs.
- [x] `APP_URL=https://www.justqiu.cloud` produces production-domain redirects.
- [x] PayGate charge payload includes the `callback_url` field.

## Risks
- PayGate callbacks depend on reachable HTTPS URLs; error and unfinish redirects
  should also be configured in PayGate settings.
