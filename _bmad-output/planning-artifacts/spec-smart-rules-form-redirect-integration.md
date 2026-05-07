# Spec: Smart Rules Form + Redirect Integration

## Task
Task 13.5 integrates the Phase 13 visual Smart Rules builder into the dashboard link form and ensures public redirect handlers evaluate ordered V2 rules with analytics intact.

## Scope
- Replace the existing single-rule smart rules form with the reusable `RuleBuilder`.
- Save enabled Smart Rules through the V2 rules API with ordered rules and optional fallback destination.
- Clear persisted rules when an existing link disables Smart Rules.
- Show readable Smart Rule summaries in the link draft preview before save.
- Pass the link destination URL into public redirect rule evaluation so no-match V2 rules fall back to the normal destination.
- Preserve split-test fallback and existing direct/link-page click logging.

## Acceptance Criteria
- New links can be created with multiple ordered V2 Smart Rules from the visual builder.
- Existing links load stored V2 or legacy rules into builder state.
- Turning Smart Rules off for an existing link removes saved rules.
- `/[slug]` and `/[slug]/go` both evaluate Smart Rules before split tests.
- Matched-rule redirects log the matched `ruleId`; fallback/default redirects log `ruleId: null`.
- Unit/integration tests cover builder API mapping, V2 redirect fallback, and default-destination redirect behavior.

## Risks
- Legacy rules must remain editable enough to avoid data loss during the transition.
- No-match V2 redirects need default-destination behavior even when the redirect route does not have an explicit link-level Smart Rules toggle.
- The rules API remains the only persistence boundary; the form should not write directly to the database.
