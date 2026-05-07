# Task 12.15 Spec — Link Pages Dashboard Real Data

## Goal
Replace the static Link Pages dashboard with authenticated, owner-scoped data from Postgres and expose a list response that can be tested like the rest of the API surface.

## Scope
- Convert `src/app/(dashboard)/pages/page.tsx` into an async server component.
- Add `listLinkPagesByUserId` in `src/lib/db/queries/links.ts`.
- Include page view and CTA click totals from `clickEvents` using batched aggregation.
- Show an empty state for users without Link Pages.
- Add a `/pages` loading skeleton.
- Add `GET /api/v1/pages` for the Link Pages list response used by the dashboard tests.

## Decisions
- The dashboard reads directly from the database on the server component path to avoid client-side fetch waterfalls.
- The API list endpoint supports both session and API key authentication, matching the existing `/api/v1/links` behavior.
- Public status is derived from `links.hasLinkPage && links.isActive`; existing Link Page records remain visible even when paused so users can edit and re-enable them.
- Create and edit CTAs route to the existing link creation/edit form where the Link Page controls already live.

## Security
- Auth is required for dashboard and API access.
- Link Pages are joined through owned links, so the query is owner-scoped.
- The API route uses plan-based rate limiting and standard `{ success, data/error }` responses.
- No secrets or raw SQL are introduced.
