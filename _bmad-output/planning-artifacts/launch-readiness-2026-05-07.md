# Launch Readiness — 2026-05-07

## Summary
Launch is closer but not ready yet. Local build/test/security prerequisites are
in good shape, local `.env` has required app values, database indexes are present
in the connected database, and the public domain now resolves through Vercel with
managed TLS. Production environment verification, monitoring, backups, load
testing, penetration testing, and go-live still require production platform
access.

## Verified
- Local environment values are present for database, auth, Redis, Resend,
  Midtrans, app URLs, cron, MaxMind, IP hashing, and currency override.
- Local `.env` now includes `AUTH_URL` and `AUTH_TRUST_HOST` without exposing
  secrets in source control.
- `.env.example` includes `AUTH_URL` and `AUTH_TRUST_HOST` placeholders.
- MaxMind MMDB files exist:
  - `src/database/geolite/asn.mmdb`
  - `src/database/geolite/city.mmdb`
  - `src/database/geolite/country.mmdb`
- `MAXMIND_DB_PATH` points to the city MMDB file.
- Connected PostgreSQL indexes verified:
  - `links_slug_unique`, `slug_idx`, `links_user_id_idx`, `links_campaign_idx`
  - `ce_link_id_idx`, `ce_ts_idx`
  - `campaigns_user_idx`, `campaigns_slug_idx`
  - `rules_link_id_idx`
- CI workflow exists for lint, typecheck, test, build, and optional Vercel deploy
  hook.
- `https://justqiu.cloud` resolves and redirects to `https://www.justqiu.cloud/`.
- `https://www.justqiu.cloud` returns `200` from Vercel with managed TLS.
- Production security headers are present on `https://www.justqiu.cloud`.
- Canonical app domain in source now points to `https://www.justqiu.cloud`.

## Blocked
- Production environment variables in Vercel cannot be verified from local files.
- Redis cache warming cannot be run safely without production/staging URL and
  known hot slugs.
- Monitoring/alerting is not configured in the repository.
- Backup/PITR policy requires Neon project/dashboard verification.
- 5000 concurrent redirect load test requires a staging or production URL.
- Basic penetration test requires a reachable staging or production deployment.
- Go-live is blocked until the above items are complete.

## Required Before Go-Live
- Set all production secrets/vars in Vercel, including `NEXT_PUBLIC_APP_URL`,
  `AUTH_URL`, `AUTH_TRUST_HOST`, `CRON_SECRET`, `IP_HASH_SALT`, and provider
  credentials.
- Confirm production `NEXT_PUBLIC_APP_URL` and `AUTH_URL` are
  `https://www.justqiu.cloud`.
- Confirm Google OAuth callback allows
  `https://www.justqiu.cloud/api/auth/callback/google`.
- Configure Cloudflare WAF/rate rules for `/:slug` and `/:slug/go`.
- Confirm Neon backup/PITR policy and database role permissions.
- Add monitoring/alerting for API errors, payment webhook failures, rate-limit
  spikes, and redirect error rates.
- Run OWASP ZAP against staging.
- Run redirect load test at the launch target of 5000 concurrent redirects.
