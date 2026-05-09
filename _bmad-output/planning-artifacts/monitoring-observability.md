# LinkSnap Monitoring & Observability

Date: 2026-05-09

## Production Signals

LinkSnap now exposes `GET /api/v1/health` for uptime monitoring. The route returns
standard API JSON with:

- `status`: `ok` or `degraded`
- `checks.database`: Neon/Drizzle read check with latency
- `checks.redis`: Upstash ping check with latency
- `checks.apiErrorsLastFiveMinutes`: Redis-backed rolling API error count
- `uptimeSeconds` and `timestamp`
- `x-request-id` response header for correlation

Use the endpoint from Vercel/Better Stack/UptimeRobot with an alert when the
status code is not 200 or the JSON `data.status` is not `ok`.

## Error Tracking

All API catch blocks should log through `logApiErrorResponse`, which emits a
structured JSON log with `requestId`, route, status, code, and a redacted error.
That helper also increments minute-bucketed Redis counters under:

```text
linksnap:metrics:api-errors:{minuteBucket}
```

The health route reads the last five buckets to surface recent error rate.
Production logs remain provider-neutral so LinkSnap can send Vercel logs to
Sentry, Logtail, Axiom, or Datadog without code changes.

## Critical Path Timing

The following paths emit `timing_metric_recorded` structured logs and store the
latest metric snapshot in Redis:

- `redirect.resolve` — short-link resolution, Link Page rendering, rule match,
  and split-test match timing
- `payment.create` — checkout creation timing and success/provider/config error
  status
- `click_queue.process` — cron queue processing timing, processed count, and
  dead-letter count

Redis keys:

```text
linksnap:metrics:timing:last:redirect.resolve
linksnap:metrics:timing:last:payment.create
linksnap:metrics:timing:last:click_queue.process
```

## Recommended Alerts

- Health endpoint non-200 for 2 consecutive minutes.
- `apiErrorsLastFiveMinutes >= 10` during launch week.
- `payment.create` provider errors above 3 in 10 minutes.
- `click_queue.process` dead-letter count above 0 for 2 consecutive cron runs.
- Redirect p99 above 500ms in Vercel Analytics or external RUM.

## Future Vendor Setup

- Add Sentry for server/client exception grouping once production DSN is issued.
- Add Logtail/Axiom/Datadog drain for structured JSON log search.
- Keep Vercel Analytics and Speed Insights enabled for page-level Web Vitals.
- Add dashboard panels for Redis metric keys after the first production traffic
  baseline is captured.
