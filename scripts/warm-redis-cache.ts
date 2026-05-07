#!/usr/bin/env bun

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const [
  { listRedirectLinksForCacheWarmup },
  { parseRedirectCacheWarmupLimit, warmRedirectCache },
] = await Promise.all([
  import("../src/lib/db/queries/links"),
  import("../src/lib/links/cache-warming"),
]);

function getArgLimit(): string | undefined {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  return limitArg?.slice("--limit=".length);
}

const limit = parseRedirectCacheWarmupLimit(
  getArgLimit() ?? process.env.REDIS_WARMUP_LIMIT,
);
const links = await listRedirectLinksForCacheWarmup({ limit });
const result = await warmRedirectCache(links);

console.log(
  [
    `Redis cache warmup complete.`,
    `total=${result.total}`,
    `cached=${result.cached}`,
    `skipped=${result.skipped}`,
    `errors=${result.errors}`,
    `ttl=${result.ttlSeconds}s`,
  ].join(" "),
);

if (result.errors > 0) {
  process.exitCode = 1;
}
