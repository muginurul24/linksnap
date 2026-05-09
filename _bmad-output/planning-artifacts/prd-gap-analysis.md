# PRD Gap Analysis — Phase 25.8

- **Date:** 2026-05-09 19:01 GMT+7
- **Source PRD:** `_bmad-output/planning-artifacts/PRD.md`
- **Implementation source:** repository state after Phase 25.7
- **Objective:** compare product promises against shipped behavior before go-live.

## Severity Definitions

- **P0:** must be fixed before launch because the product publicly promises it or core MVP behavior is wrong.
- **P1:** legitimate product gap, but safe to defer to the next approved phase when not currently exposed as launched functionality.
- **P2:** explicitly out of MVP scope, or intentionally not built with PRD rationale.

## Executive Summary

- **Remaining P0 gaps:** 0.
- **P0 gaps fixed in 25.8:** 2.
- **P1 follow-up gaps:** 4.
- **P2 / not MVP:** 7.

The MVP is launchable after 25.8 from a PRD-alignment perspective. The two launch-blocking mismatches were corrected: Smart Rules are no longer Pro-gated for Free users, and Business pricing no longer advertises click-event webhook callbacks as a shipped feature.

## MVP Coverage

| PRD Area | Status | Evidence |
|---|---:|---|
| Short link creation, random/custom slug | ✅ Covered | `/api/v1/links`, dashboard link form, link query layer, slug validation tests. |
| Redirect endpoint with permanent redirect | ✅ Covered | Root slug route plus CTA route; tests cover 308 redirect and click analytics. |
| QR generation PNG/SVG | ✅ Covered | `/api/v1/qr/[slug]`, QR dashboard, QR API/integration tests. |
| Link Pages with CTA/countdown/social proof | ✅ Covered | Link Page API, renderer, dashboard pages, Link Page tests. |
| Smart Redirect Rules geo/device | ✅ Covered | Smart Rules API, rule engine, dashboard builder, integration tests. |
| Email/password auth, Google OAuth, OTP verification | ✅ Covered | Auth routes, NextAuth v5 route, OTP flows, auth E2E. |
| Dashboard links/pages/QR/campaigns/analytics/settings | ✅ Covered | Phase 24 route-state and cross-navigation pass. |
| Analytics by link and campaign | ✅ Covered | Analytics API, dashboard charts, campaign analytics, export CSV. |
| Campaign CRUD and UTM builder | ✅ Covered | Campaign APIs, dashboard manager, UTM preview tests. |
| PayGate payment lifecycle | ✅ Covered | Create payment, status, subscriptions, webhook, invoice email tests. |
| Public site, pricing, demo, blog | ✅ Covered | Marketing pages, pricing, demo generator, MDX blog, public E2E. |

## P0 Gaps Fixed

### P0-1 — Free Smart Rules UI Gate

- **PRD promise:** Smart Rules are available in Free tier with a 2-rule limit.
- **Found behavior:** Dashboard form plan gate treated Smart Rules like a Pro-only feature even though API limits allowed Free users.
- **Fix:** Free users can now enable Smart Rules; quota enforcement still uses the plan limit.
- **Files:** `src/app/(dashboard)/links/link-form.tsx`, `tests/unit/link-form-plan-gates.test.tsx`.
- **Status:** ✅ Fixed.

### P0-2 — Business Webhook Callback Claim

- **PRD promise:** Business tier includes webhook callbacks for click events.
- **Found behavior:** Payment webhooks exist, but click-event/customer webhook callbacks are not implemented.
- **Fix:** Pricing no longer advertises webhook callbacks as launched. The comparison row now marks it as roadmap, and tests prevent reintroducing the launch claim before implementation.
- **Files:** `src/lib/plans/definitions.ts`, `tests/unit/plan-definitions.test.ts`.
- **Status:** ✅ Fixed as a public-claim issue; implementation remains P1.

## P1 Follow-Up Gaps

| Gap | Why P1 | Recommended next phase task |
|---|---|---|
| Click-event webhook callbacks | PRD matrix and developer persona mention it, but it is no longer advertised as launched after 25.8. | Add per-user webhook endpoints, HMAC signing, delivery logs, retry/backoff, dashboard management, and abuse limits. |
| PDF/API analytics export | PRD matrix lists CSV + PDF for Pro and CSV + PDF + API for Business. Current implementation supports CSV and API access, but not PDF exports. | Add export job model, PDF renderer, signed download URLs, and plan-gated API export endpoint. |
| Link scheduler dashboard controls | Schema and redirect availability support `scheduledAt`/`expiresAt`, but owner-facing create/edit controls are not complete. | Add Pro/Business schedule/expiry inputs, validation, disabled states, and E2E coverage. |
| PayGate manual retry dashboard | PRD risk mitigation calls for manual retry dashboard. Webhook handling is idempotent, but operator retry UI is not present. | Add admin billing operations page for failed/pending transactions, manual refresh, retry audit log, and role-gated actions. |

## P2 / Not MVP

| Item | PRD Rationale |
|---|---|
| Custom domains | Explicitly out of scope for MVP; V2. |
| Password-protected links | Explicitly out of scope for MVP; V2. |
| Team/workspace accounts | Explicitly out of scope for MVP; V2. |
| White-label/reseller | Explicitly out of scope for MVP; V2/later. |
| Native iOS/Android deep linking | Explicitly out of scope for MVP; V2. |
| Enterprise SSO/SAML | Not in MVP; belongs to later enterprise scope. |
| Affiliate/referral program | Not in MVP; belongs to growth/marketing roadmap. |

## Launch Decision

Phase 25.8 closes all PRD-alignment launch blockers. The remaining P1 items should be proposed as a new approved phase after go-live because they require new persistence, UI, provider-facing behavior, or operational workflows.
