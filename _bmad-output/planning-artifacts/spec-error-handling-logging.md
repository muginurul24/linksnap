# Tech Spec: Error Handling And Logging

## Problem
Task 10.1 needs consistent user-facing failure pages, a standard API error envelope, and server logs that can be correlated with the request ID returned to clients.

## Approach
Add root `app/error.tsx` and `app/not-found.tsx` UI that matches the public product shell. Keep API responses on the existing `{ success, data/error }` helper and add response-header coverage for `requestId`. Introduce a small structured logger wrapper and use it from the response helper so every API error response emits a JSON log with request ID, code, status, and message.

## Affected Files
- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/lib/api/response.ts`
- `src/lib/observability/logger.ts`
- `tests/unit/api-response.test.ts`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] Runtime UI errors render a branded fallback with a retry action.
- [x] Missing routes render a branded 404 with safe navigation.
- [x] API error responses include `{ success: false, error: { code, message, requestId } }`.
- [x] API error responses include an `x-request-id` header.
- [x] API 5xx error responses log a structured record with the same `requestId`.

## Risks
- Automatically logging from `errorResponse` should avoid expected 4xx responses; 5xx responses must be emitted at error level.
- `app/error.tsx` is a client component, so it must not leak sensitive server error details into the rendered UI.
