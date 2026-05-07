# Tech Spec: Phase 15 PlanGate Component

## Problem
Plan-gated controls are currently handled inconsistently. Some flows let free users interact with controls and only show an error after submission, which is frustrating and harder to scan.

## Approach
Create a reusable `PlanGate` wrapper that renders children normally when allowed and presents a disabled, visually muted upgrade affordance when blocked. Add a `PlanGate.Quota` variant for quota-exhausted cases using the same visual treatment.

## Affected Files
- `src/components/plan-gate.tsx`
- `tests/unit/plan-gate.test.tsx`

## Acceptance Criteria
- [x] Allowed controls render without gate copy or disabled state.
- [x] Blocked controls render disabled with lock icon, upgrade copy, and upgrade link.
- [x] Quota gates block when `used >= limit` and display the current quota usage.
- [x] Component works in server-rendered unit tests.

## Risks
- Passing `disabled` to arbitrary custom components can leak unsupported props, so the helper should only target likely interactive controls.
- The component must stay presentational; authorization still belongs in API routes.
