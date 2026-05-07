# Tech Spec: Midtrans Redirect URL Configuration

## Problem
Midtrans Snap redirect checkout needs deterministic return URLs on the
production domain so users can return to LinkSnap after finishing, cancelling,
or failing hosted checkout.

## Approach
- Use the existing `buildPaymentRedirectUrls` helper to derive finish, error,
  and unfinish URLs from `APP_URL`, `NEXT_PUBLIC_APP_URL`, or request origin.
- Pass those URLs from `src/app/api/v1/payments/create/route.ts` into
  `createMidtransSnapTransaction`.
- Keep the actual Snap API payload to Midtrans' documented `callbacks.finish`
  request field. Error and unfinish URLs are generated and tested so they can be
  configured in Midtrans Snap Preference / Redirection Settings.
- Verify production-domain URL generation with existing integration and unit
  tests.

## Affected Files
- `src/app/api/v1/payments/create/route.ts`
- `src/lib/payments/redirects.ts`
- `src/lib/payments/midtrans.ts`
- `tests/integration/create-payment-api.test.ts`
- `tests/unit/payment-redirects.test.ts`
- `tests/unit/midtrans-client.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] Payment creation generates `/checkout/success?order_id=...` finish URLs.
- [x] Payment creation generates `/checkout/cancel?...status=error` URLs.
- [x] Payment creation generates `/checkout/cancel?...status=unfinish` URLs.
- [x] `APP_URL=https://www.justqiu.cloud` produces production-domain redirects.
- [x] Snap payload includes the documented `callbacks.finish` callback.

## Risks
- Midtrans documents API override support for `callbacks.finish`; error and
  unfinish redirects should also be set in Snap Preference / Redirection
  Settings for hosted redirect checkout.
