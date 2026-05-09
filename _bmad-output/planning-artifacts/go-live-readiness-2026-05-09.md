# Go-Live Readiness — Phase 25.11

- **Date:** 2026-05-09 19:53 GMT+7
- **Decision:** No-go for full launch.
- **Reason:** production Google OAuth is not using the canonical `www.justqiu.cloud` Auth.js URLs, and the Flutter Android build could not be produced from the current local toolchain.

## Current Gate Results

| Gate | Status | Evidence |
|---|---:|---|
| PRD gap audit | ✅ Pass | Phase 25.8 report shows 0 remaining P0 PRD gaps after fixes. |
| Web typecheck | ✅ Pass | `rtk bun run typecheck` passed in Phase 25.8/25.9. |
| Web lint | ✅ Pass | `rtk bun run lint` passed in Phase 25.8/25.9. |
| Unit/integration suite | ✅ Pass | `rtk bun run test` passed: 176 files passed, 1 skipped; 785 tests passed, 2 skipped. |
| Targeted browser E2E | ✅ Pass | Link creation plus redirect analytics E2E passed: 1 test passed. |
| Production build | ✅ Pass | `rtk bun run build` completed successfully with 77 static pages generated. |
| Google OAuth production smoke | ❌ Blocked | `rtk bun run smoke:google-oauth` failed because production generated `https://justqiu.cloud/api/auth/signin/google` instead of `https://www.justqiu.cloud/api/auth/signin/google`. |
| Flutter Android release | ⚠️ Blocked | Flutter snap SDK download did not complete and `apps/mobile_flutter/android/` is missing. |
| Manual full dashboard/public walkthrough | ⚠️ Not complete | Should be performed after OAuth smoke is green and a production deploy contains the final env. |

## Launch Blockers

### 1. Google OAuth Canonical URL Mismatch

Production `https://www.justqiu.cloud/api/auth/providers` currently returns non-`www` Google URLs:

```text
signinUrl:  https://justqiu.cloud/api/auth/signin/google
callbackUrl: https://justqiu.cloud/api/auth/callback/google
```

Required Vercel Production values:

```text
AUTH_URL=https://www.justqiu.cloud
NEXTAUTH_URL=https://www.justqiu.cloud
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://www.justqiu.cloud
APP_URL=https://www.justqiu.cloud
```

After updating env and redeploying:

```bash
rtk bun run smoke:google-oauth
```

Then complete the manual Google account login walkthrough in `_bmad-output/planning-artifacts/google-oauth-production.md`.

### 2. Flutter Android Build Not Produced

`apps/mobile_flutter` has no `android/` directory and Flutter snap first-run initialization tried to download a 1.4GB SDK archive at an estimated 80-180 minute completion time.

Finish `_bmad-output/planning-artifacts/flutter-mobile-build.md` before marking mobile release ready.

## Go-Live Criteria To Recheck

Before marking Phase 25.11 complete:

1. `rtk bun run smoke:google-oauth` passes against production.
2. Real Google account login returns to `/links` or the requested callback URL.
3. `rtk bun run smoke:production` passes with authenticated checks when a production smoke cookie is available.
4. Dashboard/public manual walkthrough is complete.
5. If mobile is launch-scope, APK and AAB artifacts exist and device install is verified.
6. Final `rtk bun run typecheck`, `rtk bun run lint`, `rtk bun run test`, targeted E2E, and `rtk bun run build` are rerun after the final production env/deploy change.
