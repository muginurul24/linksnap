export const CACHE_SCHEMA_VERSION = "v1";
export const CACHE_VERSION_FALLBACK = "1";
export const CACHE_VERSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const SAFE_CACHE_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export type DashboardAnalyticsCacheKeyInput = {
  from: Date;
  globalVersion?: string | number;
  schemaVersion?: string;
  to: Date;
  userId: string;
  userVersion?: string | number;
};

export type AdminAnalyticsCacheKeyInput = {
  asOf?: Date;
  schemaVersion?: string;
  version?: string | number;
  windowDays?: number;
};

export function sanitizeCacheSegment(value: string, label: string): string {
  const trimmed = value.trim();
  if (!SAFE_CACHE_SEGMENT_PATTERN.test(trimmed)) {
    throw new Error(`Invalid ${label} cache key segment.`);
  }

  return trimmed;
}

export function formatUtcCacheDay(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid cache date segment.");
  }

  return date.toISOString().slice(0, 10);
}

function sanitizeVersion(version: string | number | undefined): string {
  if (version === undefined) return CACHE_VERSION_FALLBACK;

  return sanitizeCacheSegment(String(version), "cache version");
}

export function buildDashboardAnalyticsUserVersionKey(userId: string): string {
  return `analytics:dashboard:${sanitizeCacheSegment(userId, "user ID")}:version`;
}

export function buildDashboardAnalyticsGlobalVersionKey(): string {
  return "analytics:dashboard:global:version";
}

export function buildAdminAnalyticsVersionKey(): string {
  return "analytics:admin:version";
}

export function buildDashboardAnalyticsCacheKey({
  from,
  globalVersion,
  schemaVersion = CACHE_SCHEMA_VERSION,
  to,
  userId,
  userVersion,
}: DashboardAnalyticsCacheKeyInput): string {
  return [
    "analytics",
    "dashboard",
    sanitizeCacheSegment(userId, "user ID"),
    formatUtcCacheDay(from),
    formatUtcCacheDay(to),
    `u${sanitizeVersion(userVersion)}`,
    `g${sanitizeVersion(globalVersion)}`,
    sanitizeCacheSegment(schemaVersion, "schema version"),
  ].join(":");
}

export function buildAdminAnalyticsCacheKey({
  asOf = new Date(),
  schemaVersion = CACHE_SCHEMA_VERSION,
  version,
  windowDays = 30,
}: AdminAnalyticsCacheKeyInput = {}): string {
  return [
    "analytics",
    "admin",
    `window-${Math.max(1, Math.floor(windowDays))}`,
    formatUtcCacheDay(asOf),
    `v${sanitizeVersion(version)}`,
    sanitizeCacheSegment(schemaVersion, "schema version"),
  ].join(":");
}

export function buildDashboardSubscriptionCacheKey(userId: string): string {
  return `dashboard:subscription:${sanitizeCacheSegment(userId, "user ID")}`;
}

export function buildSmartRulesCacheKey(slug: string): string {
  return `smart-rules:${sanitizeCacheSegment(slug, "slug")}`;
}
