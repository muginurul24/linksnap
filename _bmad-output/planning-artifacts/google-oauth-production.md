# Google OAuth Production Setup

- **Date:** 2026-05-09 19:55 GMT+7
- **Production app URL:** `https://www.justqiu.cloud`
- **Auth provider:** Google OAuth through Auth.js / NextAuth v5.

## Required Google Cloud Console Values

Configure the production OAuth client in Google Cloud Console:

| Field | Value |
|---|---|
| Authorized JavaScript origin | `https://www.justqiu.cloud` |
| Authorized redirect URI | `https://www.justqiu.cloud/api/auth/callback/google` |

The OAuth consent screen must be published for the intended audience. Keep the app name, support email, authorized domain `justqiu.cloud`, and privacy/terms URLs aligned with production.

## Required Vercel Environment Values

Set these in the Vercel Production environment, then redeploy:

```text
AUTH_URL=https://www.justqiu.cloud
NEXTAUTH_URL=https://www.justqiu.cloud
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=<production Google client ID>
AUTH_GOOGLE_SECRET=<production Google client secret>
NEXT_PUBLIC_APP_URL=https://www.justqiu.cloud
APP_URL=https://www.justqiu.cloud
```

`AUTH_URL` and `NEXTAUTH_URL` must use the same canonical `www` host as the deployed app. A non-`www` value causes Auth.js to generate a non-`www` callback URL, which Google will reject if the Google Console only allows the `www` redirect URI.

## Automated Smoke

Run:

```bash
rtk bun run smoke:google-oauth
```

The smoke verifies:

- `/api/auth/providers` exposes the Google provider.
- The generated Google `signinUrl` is `https://www.justqiu.cloud/api/auth/signin/google`.
- The generated Google `callbackUrl` is `https://www.justqiu.cloud/api/auth/callback/google`.
- Starting Google sign-in returns a redirect to `accounts.google.com`.

## Manual End-To-End Login

After the smoke passes:

1. Open `https://www.justqiu.cloud/login`.
2. Click **Sign in with Google**.
3. Complete Google account authentication and consent.
4. Confirm the browser returns to `/links` or the requested `callbackUrl`.
5. Confirm the account exists in LinkSnap with `googleId`, `emailVerified`, and the expected plan/role.

Do not automate real Google account credentials in CI. Google login can trigger CAPTCHA, device trust prompts, and 2FA, and storing those credentials would violate security best practice.

## Current Verification Result

Automated smoke on 2026-05-09 found production is still generating non-canonical provider URLs:

```text
signinUrl:  https://justqiu.cloud/api/auth/signin/google
callbackUrl: https://justqiu.cloud/api/auth/callback/google
```

The `www.justqiu.cloud` Google sign-in endpoint returned HTTP 400 instead of redirecting to Google. Update Vercel Production `AUTH_URL` and `NEXTAUTH_URL` to `https://www.justqiu.cloud`, redeploy, rerun `rtk bun run smoke:google-oauth`, then perform the manual login walkthrough.
