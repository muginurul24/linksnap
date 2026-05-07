# Tech Spec: Smart Rules API V2

## Problem
The Smart Rules API only accepts legacy `{ type, condition, destinationUrl, priority }` rows. Phase 13 needs ordered visual-builder rules with active state, multiple conditions, bot/time support, and a fallback destination while preserving existing clients.

## Approach
Extend validation with V2 schemas and normalize V2 requests into the current `smart_rules` table by storing the V2 payload inside the JSON `condition` field. The API route will accept both legacy and V2 payloads, enforce quota against visible V2 rules only, serialize V2 rows back into display order, and expose `fallbackDestinationUrl`.

## Affected Files
- `src/lib/validations/smart-rule.ts`
- `src/app/api/v1/links/[id]/rules/route.ts`
- `tests/unit/smart-rule-validation.test.ts`
- `tests/integration/smart-rules-api.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [ ] V2 request schema accepts ordered rules with `isActive`, `conditions`, and `destinationUrl`.
- [ ] V2 request schema accepts optional `fallbackDestinationUrl`.
- [ ] Legacy request schema still works.
- [ ] GET returns V2 rules in display order when V2 data is stored.
- [ ] POST and PUT replace rules in request order.
- [ ] Quota enforcement counts visible V2 rules, not the internal fallback sentinel.

## Risks
- Fallback-only configuration requires an internal sentinel row because no dedicated link config column exists yet. The route must hide that sentinel from V2 GET responses.
