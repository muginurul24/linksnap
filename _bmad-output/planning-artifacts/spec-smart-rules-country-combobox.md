# Tech Spec: Smart Rules Country Combobox

## Problem
Smart Rules currently ask users to type country conditions manually, which is error-prone and unclear. Phase 13 needs a searchable ISO 3166-1 country picker that returns a country code to parent forms.

## Approach
Add a reusable country data/helper module and a client `CountryCombobox` built from shadcn `Command` inside the existing popover/button primitives. The component will filter by country name or alpha-2 code, show flag emoji labels, handle empty results, and expose the selected ISO code through `onValueChange`.

## Affected Files
- `src/lib/countries.ts`
- `src/components/smart-rules/country-combobox.tsx`
- `src/components/ui/command.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/textarea.tsx`
- `tests/unit/country-combobox.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [ ] Country list exposes ISO 3166-1 alpha-2 codes with display names.
- [ ] Combobox uses shadcn `Command` and supports type-to-filter behavior.
- [ ] Selected country code is returned to parent state.
- [ ] Empty searches show "No country found".
- [ ] Unit tests cover filtering, selection lookup, and keyboard navigation helper behavior.

## Risks
- `Intl.DisplayNames` output can vary subtly by runtime, so tests should assert stable codes and core search behavior rather than full list ordering.
