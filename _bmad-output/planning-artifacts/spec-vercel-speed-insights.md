# Tech Spec: Vercel Speed Insights

## Problem
LinkSnap needs real user performance telemetry in production without adding custom web vitals plumbing or weakening the existing strict CSP posture.

## Approach
Install Vercel's Speed Insights package and render its Next.js component from the root layout so every route reports web vitals through Vercel's managed pipeline. Inspect the package output before changing CSP; only add narrowly scoped CSP allowances if the installed package requires external scripts or network targets.
Wrap the component with a client-side `beforeSend` sanitizer so query strings, hashes, and concrete dynamic identifiers are not sent to Vercel telemetry.

## Affected Files
- `package.json`
- `bun.lock`
- `src/app/layout.tsx`
- `src/components/observability/vercel-speed-insights.tsx`
- `src/lib/observability/speed-insights.ts`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] `@vercel/speed-insights` is installed with Bun.
- [x] The Speed Insights component is mounted once globally from the root layout.
- [x] Existing nonce/CSP behavior is preserved unless a narrow package-specific allowance is required.
- [x] Sensitive URL query/hash data is stripped before telemetry is sent.
- [x] Typecheck, lint, tests, and build pass.

## Risks
- Speed Insights may inject scripts or send beacons that conflict with the current strict CSP.
- Adding the component in the wrong place could expand the client boundary more than necessary.
- Production data collection depends on Vercel project configuration outside this repository.
