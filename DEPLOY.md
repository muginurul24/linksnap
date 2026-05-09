# LinkSnap Deployment Guide

Production target: `https://www.justqiu.cloud`

This project is a Next.js 16 App Router application deployed on Vercel with Neon
PostgreSQL, Upstash Redis, Resend, Google OAuth, and PayGate.

## 1. Production Environment

Use `.env.example` as the source of truth for required variables. Never commit
`.env`, `.env.local`, `.env.production`, or Vercel-pulled env files.

Required production values:

| Variable | Production value or source |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://www.justqiu.cloud` |
| `NEXT_PUBLIC_API_URL` | `https://www.justqiu.cloud/api/v1` |
| `APP_URL` | `https://www.justqiu.cloud` |
| `AUTH_URL` | `https://www.justqiu.cloud` |
| `NEXTAUTH_URL` | `https://www.justqiu.cloud` compatibility alias |
| `AUTH_TRUST_HOST` | `true` |
| `AUTH_SECRET` | 32+ byte random secret |
| `AUTH_GOOGLE_ID` | Google OAuth production client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth production client secret |
| `DATABASE_URL` | Neon pooled PostgreSQL connection URL |
| `UPSTASH_REDIS_URL` | Upstash production Redis REST URL |
| `UPSTASH_REDIS_TOKEN` | Upstash production Redis REST token |
| `RESEND_API_KEY` | Resend production API key |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `LinkSnap <noreply@justqiu.cloud>` |
| `PAYGATE_API_BASE_URL` | PayGate production base URL |
| `PAYGATE_STORE_API_TOKEN` | PayGate store token |
| `PAYGATE_WEBHOOK_SECRET` | PayGate webhook HMAC secret |
| `CRON_SECRET` | 32+ char shared Vercel Cron secret |
| `IP_HASH_SALT` | 32+ char random analytics salt |
| `USD_IDR_RATE` | Manual fallback, currently `16000` |
| `MAXMIND_DB_PATH` | Optional GeoLite2 City database path when bundled |

Local-only values must not be set in production:

- `AUTH_EMAIL_DELIVERY=file`
- `PAYMENT_EMAIL_DELIVERY=file`
- `AUTH_EMAIL_FILE`
- `PAYMENT_EMAIL_FILE`

## 2. Verify Environment Locally

If you have a Vercel production env pull, save it outside git or to an ignored
file, then run:

```bash
rtk ENV_FILE=.env.production.local scripts/verify-production-env.sh
```

To verify the active shell environment:

```bash
rtk scripts/verify-production-env.sh
```

The script checks required variables, production URL alignment, minimum secret
lengths, local-only email settings, PayGate HTTPS, and prints the manual
dashboard items that cannot be verified from git.

## 3. Vercel Project Settings

Configure these in Vercel Project Settings:

- Framework: Next.js
- Install command: `bun install`
- Build command: `bun run build`
- Output: Vercel default for Next.js
- Node runtime: use the Vercel default compatible with Next.js 16
- Production branch: `main`

Custom domains:

- `www.justqiu.cloud`
- `justqiu.cloud`, redirecting to `https://www.justqiu.cloud`

Cron jobs are defined in `vercel.json`:

- `/api/v1/analytics/click-queue/process` every minute
- `/api/v1/payments/subscriptions/renew` daily at 00:00 UTC

Both cron endpoints require:

```http
Authorization: Bearer ${CRON_SECRET}
```

## 4. Google OAuth

In Google Cloud Console, configure the production OAuth client:

Authorized JavaScript origins:

```text
https://www.justqiu.cloud
```

Authorized redirect URIs:

```text
https://www.justqiu.cloud/api/auth/callback/google
```

After saving, set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in Vercel
Production. Rotate the secret if it was ever shared outside the Google Console
or Vercel.

Run the dedicated OAuth smoke after every auth env change:

```bash
rtk bun run smoke:google-oauth
```

The smoke must show the canonical `www.justqiu.cloud` sign-in and callback
URLs before doing a real Google account login walkthrough. See
`_bmad-output/planning-artifacts/google-oauth-production.md` for the full
procedure and the current production verification result.

## 5. PayGate Webhook

In the PayGate store dashboard, configure:

```text
https://www.justqiu.cloud/api/v1/payments/webhook
```

The webhook must sign payloads with `PAYGATE_WEBHOOK_SECRET`. LinkSnap rejects
invalid signatures, validates amounts server-side, and ignores replayed terminal
states.

## 6. Production Build and Smoke Test

Run locally before deploying:

```bash
rtk bun run typecheck
rtk bun run lint
rtk bun run test
rtk bun run build
```

After deployment:

```bash
rtk bun run smoke:production
rtk bun run security:smoke
```

Authenticated production smoke checks require a valid session cookie:

```bash
rtk PRODUCTION_SMOKE_COOKIE='next-auth.session-token=...' bun run smoke:production
```

Admin mutation smoke is opt-in only:

```bash
rtk PRODUCTION_SMOKE_COOKIE='...' \
  PRODUCTION_SMOKE_ADMIN_USER_ID='user-id' \
  PRODUCTION_SMOKE_RUN_ADMIN_MUTATION=true \
  bun run smoke:production
```

## 7. Deployment Flow

1. Pull latest `main`.
2. Run the quality gate.
3. Confirm Vercel Production env with `scripts/verify-production-env.sh`.
4. Push to `main`.
5. Monitor Vercel deployment logs until deployment is ready.
6. Run production smoke and security smoke against `https://www.justqiu.cloud`.
7. Verify PayGate checkout and webhook settlement with a low-value sandbox/live
   transaction depending on PayGate environment.
8. Verify Google OAuth sign-in with a real Google account.

## 8. External Checks That Require Dashboard Access

These cannot be proven from the repository alone and must be checked in the
provider dashboards:

- Vercel Production env variables are present and scoped to Production.
- Vercel custom domains are active with valid TLS certificates.
- Vercel Cron jobs are enabled.
- Google OAuth consent screen is published for the intended audience.
- PayGate webhook URL and webhook secret match production.
- Upstash Redis is sized for expected production traffic.
- Neon backups and point-in-time recovery are enabled for the production branch.
