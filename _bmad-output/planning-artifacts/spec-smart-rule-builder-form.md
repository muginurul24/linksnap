# Tech Spec: Smart Rule Builder Form

## Problem
The current link form exposes Smart Rules as one manual rule type/value/destination row. Phase 13 needs a visual builder that can express multiple ordered rules, multiple conditions, active toggles, destination URLs, and fallback behavior without asking users to write JSON.

## Approach
Add a reusable `RuleBuilder` client component backed by pure state helpers in `src/lib/rules/rule-builder.ts`. The builder will render condition-specific controls for country, device, bot, and time conditions, expose add/remove/reorder operations, and produce readable summaries that can be reused by the link form preview.

## Affected Files
- `src/lib/rules/rule-builder.ts`
- `src/components/smart-rules/rule-builder.tsx`
- `tests/unit/rule-builder.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [ ] Users can add, remove, activate/deactivate, and reorder rules.
- [ ] Users can add/remove conditions per rule.
- [ ] Condition controls change by type: country combobox, device dropdown, bot checkboxes/custom input, and time range inputs.
- [ ] Each rule has a destination URL and readable summary.
- [ ] Builder includes a fallback/default destination field.
- [ ] Unit tests cover validation, add/remove/reorder operations, and condition control selection.

## Risks
- The component is not wired into the link form until Task 13.5, so this task keeps the builder standalone and testable.
