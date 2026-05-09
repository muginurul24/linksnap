# LinkSnap Load Testing & Performance Baseline

Date: 2026-05-09

## Scope

Task 25.5 establishes reproducible launch load tests for:

- Redirect cache-hit path: target 5000 concurrent virtual users, p50 < 5ms,
  p99 < 500ms.
- Analytics API: 10 requests/second sustained.
- Payment create API: protected low-rate baseline with real auth/session and
  PayGate sandbox or approved production test channel.
- Rate limiting: redirect rate-limit probe validates 429 behavior under excess
  traffic.

## Artifacts

- `scripts/load-test-redirect.yml` — Artillery redirect and rate-limit profile.
- `scripts/load-test-api.yml` — Artillery analytics/payment profile.
- `scripts/load-test-redirect.sh` — Guarded wrapper with dry-run validation and
  required environment checks.

## Commands

Dry-run validation:

```bash
rtk proxy bash scripts/load-test-redirect.sh --dry-run redirect
rtk proxy bash scripts/load-test-redirect.sh --dry-run api
```

Approved redirect run:

```bash
rtk proxy env LOAD_TEST_TARGET=https://www.justqiu.cloud \
  LOAD_TEST_SLUG=existing-cached-slug \
  bash scripts/load-test-redirect.sh run redirect
```

Approved analytics/payment run:

```bash
rtk proxy env LOAD_TEST_TARGET=https://www.justqiu.cloud \
  LOAD_TEST_SESSION_COOKIE='next-auth.session-token=...' \
  LOAD_TEST_LINK_ID='owned-link-id' \
  bash scripts/load-test-redirect.sh run api
```

## Results

| Check | Status | Evidence |
| --- | --- | --- |
| Script/config validation | Passed | Dry-run wrapper verifies redirect/api configs and required variables. |
| 5000 concurrent redirect test | Ready for approved run | Requires production/staging target and known cached slug to avoid generating unapproved traffic. |
| Analytics API 10 req/s | Ready for approved run | Requires authenticated session cookie and owned link ID. |
| Payment create API baseline | Ready for approved run | Requires authenticated session and approved PayGate sandbox/live test window. |
| Rate limiting activation | Covered by profile and existing tests | Redirect profile includes a rate-limit probe phase; app-level rate-limit tests already cover limiting behavior. |
| Redis connection pooling | Covered operationally | Upstash REST client is shared singleton; health endpoint and load profile expose failures through Redis check/error metrics. |

## Launch Decision

The repository now contains the repeatable load-test harness. The destructive or
traffic-heavy runs are intentionally gated behind explicit environment variables
and must be executed only during an approved staging or production load window.

No bottlenecks were found from code-level review in this task. Production
baseline numbers must be pasted into this file after the first approved run.
