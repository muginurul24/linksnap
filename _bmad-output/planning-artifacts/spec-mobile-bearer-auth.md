# Tech Spec: Mobile Bearer Auth Contract

## Problem
`apps/mobile_flutter` uses `Authorization: Bearer` access tokens plus refresh tokens, but the backend protected APIs currently depend on NextAuth cookies. Mobile login, refresh, and core API calls cannot work end-to-end without a dedicated mobile token contract.

## Approach
Add a first-party mobile auth layer without introducing a new auth library:
- Issue short-lived HMAC-signed access tokens using `AUTH_SECRET`.
- Store only a SHA-256 refresh token hash in `users.refreshTokenHash`.
- Rotate refresh tokens on every refresh.
- Support mobile Bearer auth as a fallback on core mobile-used API routes while preserving existing NextAuth cookie behavior.

## Affected Files
- `src/lib/auth/mobile-token.ts`
- `src/lib/auth/request-user.ts`
- `src/lib/db/queries/mobile-auth.ts`
- `src/lib/validations/auth.ts`
- `src/app/api/v1/auth/login/route.ts`
- `src/app/api/v1/auth/refresh/route.ts`
- `src/app/api/v1/auth/logout/route.ts`
- `src/app/api/v1/auth/me/route.ts`
- Core mobile-used API routes under `src/app/api/v1/*`
- `tests/unit/mobile-token.test.ts`
- `tests/integration/mobile-auth-api.test.ts`

## Acceptance Criteria
- [x] Mobile login returns `{ user, token, refreshToken }` for verified password users.
- [x] Mobile login rejects invalid credentials, unverified accounts, deleted accounts, and 2FA-required accounts.
- [x] Refresh validates the stored hash, rotates refresh token, and issues a new access token.
- [x] Logout clears the stored refresh token hash.
- [x] `/api/v1/auth/me` works with Bearer tokens.
- [x] Core mobile-used APIs accept Bearer tokens without breaking cookie sessions.
- [x] Typecheck, lint, and tests pass.

## Risks
- Access tokens cannot be revoked until expiry; keep expiry short and rely on refresh rotation.
- This uses a single refresh token hash per user, so login on a second device invalidates the first device's refresh token. That is acceptable for this phase and can evolve to a token table for multi-device sessions.
- Existing mobile UI does not implement 2FA challenge entry, so 2FA-enabled accounts must fail with a clear API error until the UI supports it.
