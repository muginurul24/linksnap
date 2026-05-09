# LinkSnap Roadmap and Known Limitations

Date: 2026-05-09

## Launch Status

LinkSnap is in final launch readiness hardening. The web app, API, dashboard,
payments, caching, observability, security, accessibility, load testing, and
disaster recovery gates have dedicated artifacts under `_bmad-output`.

## MVP Complete

- Short link CRUD and redirect flow.
- Link Pages with CTA, countdown, QR display, and analytics events.
- Campaign CRUD, campaign-link assignment, UTM application, and campaign
  analytics.
- Smart redirect rules and split-test configuration.
- Dashboard analytics with friendly empty, loading, forbidden, and error states.
- Email/password auth, Google OAuth support, email verification, password reset,
  2FA, account settings, and account deletion.
- PayGate checkout, payment history, subscription cancel/reactivate/renew, and
  signed webhook processing.
- API keys, paid API docs, OpenAPI JSON, and plan-aware API limits.
- Superadmin user management, plan override, suspension, analytics, and audit
  log.
- Vercel Speed Insights, structured logging, health endpoint, and production
  smoke scripts.
- Neon backup/recovery documentation and Drizzle migration baseline.

## Known Launch Limitations

| Area | Limitation | Current handling |
| --- | --- | --- |
| Custom domains | Branded customer domains are not part of MVP. | V2 roadmap item. |
| Teams/workspaces | Accounts are single-user. | V2 roadmap item. |
| Password-protected links | Not available in MVP. | V2 roadmap item. |
| Enterprise SSO | Not available in MVP. | V3 roadmap item. |
| White label/reseller | Not available in MVP. | Later roadmap item. |
| Affiliate/referral | Not available in MVP. | Later roadmap item. |
| Provider verification | Google OAuth and PayGate live checks need dashboard access and real credentials. | Tracked in launch checklist and production smoke notes. |
| Load testing | High-concurrency scripts are opt-in only. | Guarded by script modes and operator approval. |
| Backup exports | Manual backups require unpooled Neon URLs and secure external storage. | Documented in disaster recovery plan. |
| Mobile app | Flutter app has auth/storage foundations but is not the launch-critical web surface. | Phase 25.10 build verification. |

## V2 Roadmap

1. Custom customer domains with domain verification, DNS instructions, TLS
   status, and per-domain abuse controls.
2. Team/workspace accounts with roles, invitations, audit history, and plan
   billing per workspace.
3. Password-protected links with rate-limited unlock attempts and owner-facing
   analytics.
4. CSV/PDF analytics export polishing and scheduled reports.
5. Webhook callbacks for Business users with delivery logs, retries, and signing
   secret rotation.
6. Link-in-bio profile product exploration, kept separate from per-link Link
   Pages.

## V3 Roadmap

1. Enterprise SSO and SCIM.
2. Advanced anomaly detection for click fraud and bot spikes.
3. Dedicated read replicas for high-volume analytics accounts.
4. White-label/reseller packaging.
5. Public integration templates for Slack, Discord, Zapier-like webhooks, and
   CRM ingestion.

## Operational Review Cadence

- Weekly until launch: production smoke, payment smoke, security smoke, and
  health endpoint review.
- Monthly after launch: dependency audit, Redis/cache metrics review, slow query
  review, and failed webhook review.
- Quarterly: security posture review, recovery drill, load baseline refresh, and
  roadmap reprioritization.
