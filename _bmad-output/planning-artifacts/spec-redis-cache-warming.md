# Tech Spec: Redis Cache Warming

## Problem
The launch checklist still has Redis cache warming unchecked. The redirect path
already caches short-link lookup payloads in Redis, but there is no repeatable
operator command to prefill that cache before launch or after deploy.

## Approach
Add a Bun script that loads app env, queries the hottest active redirect links,
and writes the same redirect cache payload used by the public redirect handler.
Keep the script bounded by a safe default limit and make it configurable through
`REDIS_WARMUP_LIMIT` or `--limit=`.

## Affected Files
- `scripts/warm-redis-cache.ts`
- `src/lib/db/queries/links.ts`
- `src/lib/links/cache-warming.ts`
- `tests/unit/redirect-cache-warming.test.ts`
- `package.json`
- `_bmad-output/implementation-artifacts/IMPLEMENTATION.md`
- `_bmad-output/implementation-artifacts/JOURNAL.md`

## Acceptance Criteria
- [x] `rtk bun run cache:warm` warms active redirect link cache entries.
- [x] Warmed cache keys and payloads match the redirect handler.
- [x] Expired, inactive, and future-scheduled links are skipped.
- [x] Script has a bounded default limit and accepts an explicit limit.

## Risks
- Running against the wrong env could warm non-production Redis. The script
  prints counts only and relies on `.env` / deployment env selection.
- Very large warmups could overload Redis or the database. The limit parser caps
  requests at 5000 links.
