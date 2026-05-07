# Tech Spec: Phase 15 Critical E2E Flows

## Problem
Existing Playwright coverage handles several launch flows, but Phase 15 requires explicit coverage for logout, campaign deletion, billing upgrade button redirects, and settings profile/password updates.

## Approach
Extend the current Playwright suite instead of adding a new runner. Reuse direct database setup for deterministic authenticated users, intercept only the billing provider redirect path, and keep provider-dependent Midtrans sandbox coverage conditional.

## Affected Files
- `tests/e2e/auth.spec.ts`
- `tests/e2e/link-flow.spec.ts`
- `tests/e2e/payment-flow.spec.ts`
- `tests/e2e/settings-flow.spec.ts`
- `src/app/(dashboard)/campaigns/campaign-actions.tsx`

## Acceptance Criteria
- [x] Auth E2E covers register, verify, login, dashboard access, and logout.
- [x] Link E2E still covers link creation, public redirect, and analytics logging.
- [x] Campaign E2E covers campaign creation, link assignment, analytics, and deletion.
- [x] Billing E2E clicks the Upgrade to Pro button and verifies the checkout redirect path.
- [x] Settings E2E updates profile and changes password successfully.

## Risks
- Provider-backed checkout can be flaky locally; use request interception for the button redirect test and leave sandbox payment test conditional.
- Dropdown selectors need stable accessible labels to avoid brittle nth-button selectors.
