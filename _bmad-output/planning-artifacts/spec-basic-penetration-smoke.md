# Tech Spec: Basic Penetration Smoke

## Problem
The launch checklist still requires a basic penetration test. Existing
production smoke verifies availability and a small API guard subset, but it does
not cover common hostile inputs such as XSS-like slugs, static secret file
exposure, malformed JSON, or invalid payment webhook signatures.

## Approach
Add a repeatable Bash smoke script that runs safe, non-destructive checks
against `BASE_URL` (defaulting to production). The script should only send
invalid requests that do not create records, process payments, or generate
clicks for valid links.

## Affected Files
- `scripts/basic-penetration-smoke.sh`
- `package.json`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] XSS-like slug requests render the not-found state and do not reflect script payloads.
- [x] Overlong slugs render the not-found state instead of server errors.
- [x] `/.env` is not publicly exposed.
- [x] Malformed JSON on an API endpoint returns a generic validation error.
- [x] Midtrans webhook requests with invalid signatures are rejected.

## Risks
- Production security behavior can vary if provider env is not configured. The
  webhook check expects production payment env to be present and should fail if
  the provider is not configured.
- This is a smoke test, not a substitute for OWASP ZAP or a manual penetration
  test by a specialist.
