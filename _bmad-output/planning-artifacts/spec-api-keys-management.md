# Tech Spec: API Keys Management

## Problem
Paid users need real API key management instead of the mock API Keys gate in
settings. API keys must not be stored in plaintext, and API requests should be
able to authenticate with `Authorization: Bearer lsnap_sk_...`.

## Approach
Add an `api_keys` table that stores only key hashes and display prefixes. Build
session-authenticated settings endpoints for listing, creating, and revoking
keys. Add server-side API key helpers for generation, hashing, bearer parsing,
and validation against paid users. Update the API mutation guard so valid-looking
bearer API key calls are not forced to send the browser CSRF header.

## Affected Files
- `src/lib/db/schema.ts`
- `src/lib/db/queries/api-keys.ts`
- `src/lib/auth/api-key-format.ts`
- `src/lib/auth/api-key.ts`
- `src/lib/security/api-request.ts`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/api-keys-panel.tsx`
- `src/app/api/v1/settings/api-keys/route.ts`
- `src/app/api/v1/settings/api-keys/[id]/route.ts`
- API docs and focused tests

## Acceptance Criteria
- [x] Free users see an upgrade gate for API keys.
- [x] Pro and Business users can list, create, and revoke API keys.
- [x] Created keys are returned once; persisted data stores only a hash and prefix.
- [x] Bearer API key auth validates active paid users and updates `lastUsedAt`.
- [x] Mutating bearer API key requests pass proxy validation without the browser-only custom header.
- [x] Unit and integration tests cover hashing, prefix parsing, CRUD, and auth.

## Risks
- Existing API routes use session auth directly, so initial bearer integration
  must be scoped and covered before broader rollout.
- Schema changes require `db:push` before production routes can use the table.
