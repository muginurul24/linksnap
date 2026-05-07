# Tech Spec: Smart Rules Ordered Engine

## Problem
The rule engine currently evaluates legacy single-condition rules by descending priority and has no concept of per-rule active state, V2 multi-condition AND logic, bot matching, or explicit fallback destinations.

## Approach
Extend `src/lib/rules/rule-engine.ts` without breaking legacy rules. V2 rules are detected by their JSON condition payload, evaluated in display order, skipped when inactive, matched with AND semantics across country/device/bot/time conditions, and can fall back to a configured destination or the link's default destination when called with Smart Rules enabled.

## Affected Files
- `src/lib/rules/rule-engine.ts`
- `tests/unit/rule-engine.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [ ] Rules evaluate in display order.
- [ ] Inactive V2 rules are skipped.
- [ ] V2 rule conditions use AND logic.
- [ ] First matching rule wins.
- [ ] Disabled Smart Rules can return the link default destination directly.
- [ ] No-match V2 flows support configured fallback and default destination behavior.
- [ ] Bot detection uses case-insensitive substring matching for predefined and custom bot patterns.
- [ ] Legacy GEO/DEVICE/TIME/LANGUAGE rules still evaluate.

## Risks
- Existing tests expected descending priority. The implementation intentionally changes that behavior to Phase 13 display-order semantics.
