# Task 12.16 Spec — Campaigns Dashboard Real Data

## Goal
Replace the mock Campaigns dashboard with authenticated, owner-scoped campaign
data and add a working campaign creation flow.

## Scope
- Convert `src/app/(dashboard)/campaigns/page.tsx` to an async server component.
- Read campaigns with the existing `listCampaignsByUserId` query.
- Add empty and loading states for the dashboard.
- Create `src/app/(dashboard)/campaigns/new/page.tsx`.
- Add an edit page and shared campaign form so dashboard edit actions have a real destination.
- Wire delete actions to the existing authenticated campaign API.

## Decisions
- Campaign cards only show fields that exist in the schema: name, slug, link count, UTM values, and timestamps.
- Campaign status is shown as setup/live based on whether any links are assigned; no fake date-based status is retained.
- Create/edit use the existing `/api/v1/campaigns` and `/api/v1/campaigns/{id}` endpoints.
- Delete uses a client action with a confirmation dialog and refreshes the server component after success.

## Security
- Dashboard, create, and edit pages require a session.
- Edit page loads the campaign by ID and verifies `campaign.userId` before rendering.
- Form input is validated client-side with the existing Zod schemas and server-side by route handlers.
- Mutations include the required `X-Requested-With` CSRF header.
