export type CacheClassification = "cache" | "do_not_cache" | "ephemeral_state";
export type CacheStorage = "http" | "none" | "redis" | "redis_state";

export type ApprovedCachePolicy = {
  classification: "cache";
  invalidation: string;
  keyPattern: string;
  owner: string;
  staleTolerance: string;
  storage: "http" | "redis";
  tenantScope: string;
  ttlSeconds: number;
};

export type EphemeralRedisPolicy = {
  classification: "ephemeral_state";
  keyPattern: string;
  owner: string;
  storage: "redis_state";
  ttlSeconds: number;
};

export type DoNotCachePolicy = {
  classification: "do_not_cache";
  owner: string;
  reason: string;
  storage: "none";
};

export const CACHE_POLICY_DOCUMENT_PATH =
  "_bmad-output/planning-artifacts/CACHE_POLICY.md";

export const CACHE_TTL_SECONDS = {
  adminAnalyticsAggregates: 30,
  dashboardAnalyticsAggregates: 60,
  dashboardSubscriptionSnapshot: 60,
  geoIpLookup: 60 * 60 * 24,
  publicMarketingContentHttp: 60 * 60,
  qrRenderPayload: 60 * 60 * 24,
  redirectClickCountSnapshot: 60,
  redirectMetadata: 300,
  smartRules: 300,
} as const;

export const APPROVED_CACHE_POLICIES = {
  adminAnalyticsAggregates: {
    classification: "cache",
    invalidation:
      "Delete on admin plan override, subscription/payment settlement, and click queue processing; otherwise TTL bounds staleness.",
    keyPattern: "linksnap:analytics:admin:window-{days}:{utcDay}:v{version}:v1",
    owner: "admin analytics",
    staleTolerance: "<=30 seconds; control center can be briefly stale.",
    storage: "redis",
    tenantScope: "superadmin-only aggregate, no user PII payloads beyond aggregate rows",
    ttlSeconds: CACHE_TTL_SECONDS.adminAnalyticsAggregates,
  },
  dashboardAnalyticsAggregates: {
    classification: "cache",
    invalidation:
      "Delete on link/page/rule mutations and click queue processing; otherwise TTL bounds staleness.",
    keyPattern: "linksnap:analytics:dashboard:{userId}:{from}:{to}:u{userVersion}:g{globalVersion}:v1",
    owner: "dashboard analytics",
    staleTolerance: "<=60 seconds; user charts can lag briefly.",
    storage: "redis",
    tenantScope: "single authenticated userId",
    ttlSeconds: CACHE_TTL_SECONDS.dashboardAnalyticsAggregates,
  },
  dashboardSubscriptionSnapshot: {
    classification: "cache",
    invalidation:
      "Delete on profile update, subscription renewal, payment settlement, and admin plan override.",
    keyPattern: "linksnap:dashboard:subscription:{userId}",
    owner: "billing/dashboard",
    staleTolerance: "<=60 seconds; never used for payment mutation authorization.",
    storage: "redis",
    tenantScope: "single authenticated userId",
    ttlSeconds: CACHE_TTL_SECONDS.dashboardSubscriptionSnapshot,
  },
  geoIpLookup: {
    classification: "cache",
    invalidation: "TTL only; MaxMind database refresh naturally ages out cached entries.",
    keyPattern: "linksnap:geo:{publicIpAddress}",
    owner: "geo analytics",
    staleTolerance: "<=24 hours; country/city drift is acceptable for analytics enrichment.",
    storage: "redis",
    tenantScope: "public IP lookup result only; private/local IPs are never cached",
    ttlSeconds: CACHE_TTL_SECONDS.geoIpLookup,
  },
  publicMarketingContentHttp: {
    classification: "cache",
    invalidation: "Redeploy or path revalidation when content changes.",
    keyPattern: "HTTP:{path}:{locale}",
    owner: "marketing",
    staleTolerance: "<=1 hour; public static content only.",
    storage: "http",
    tenantScope: "public, no user-specific data",
    ttlSeconds: CACHE_TTL_SECONDS.publicMarketingContentHttp,
  },
  qrRenderPayload: {
    classification: "cache",
    invalidation: "Delete on link destination/link-page availability changes; otherwise TTL.",
    keyPattern: "linksnap:qr:{slug}:{format}:{size}",
    owner: "QR rendering",
    staleTolerance: "<=24 hours only when link availability is unchanged.",
    storage: "redis",
    tenantScope: "public slug and render parameters",
    ttlSeconds: CACHE_TTL_SECONDS.qrRenderPayload,
  },
  redirectClickCountSnapshot: {
    classification: "cache",
    invalidation: "Increment on counted click events; TTL refresh after writes.",
    keyPattern: "linksnap:redirect-click-count:{linkId}",
    owner: "redirect metrics",
    staleTolerance: "<=60 seconds; display-only count.",
    storage: "redis",
    tenantScope: "single linkId owned by one user",
    ttlSeconds: CACHE_TTL_SECONDS.redirectClickCountSnapshot,
  },
  redirectMetadata: {
    classification: "cache",
    invalidation:
      "Delete on link create/update/delete, Link Page changes, Smart Rules changes, schedule/expiry/status changes.",
    keyPattern: "linksnap:redirect:{slug}",
    owner: "public redirect",
    staleTolerance: "<=300 seconds only for non-mutated links.",
    storage: "redis",
    tenantScope: "public slug metadata, no click counts or secrets",
    ttlSeconds: CACHE_TTL_SECONDS.redirectMetadata,
  },
  smartRules: {
    classification: "cache",
    invalidation: "Delete on Smart Rules replace/delete and link destination changes.",
    keyPattern: "linksnap:smart-rules:{slug}",
    owner: "smart rules",
    staleTolerance: "<=300 seconds only for unchanged rule sets.",
    storage: "redis",
    tenantScope: "public slug rule set, no user auth data",
    ttlSeconds: CACHE_TTL_SECONDS.smartRules,
  },
} as const satisfies Record<string, ApprovedCachePolicy>;

export const EPHEMERAL_REDIS_POLICIES = {
  clickQueue: {
    classification: "ephemeral_state",
    keyPattern: "linksnap:click-events:redirect",
    owner: "click logging",
    storage: "redis_state",
    ttlSeconds: 60 * 60,
  },
  pendingEmailChanges: {
    classification: "ephemeral_state",
    keyPattern: "linksnap:auth:change-email:{userId}",
    owner: "auth settings",
    storage: "redis_state",
    ttlSeconds: 10 * 60,
  },
  rateLimits: {
    classification: "ephemeral_state",
    keyPattern: "rate-limit:{domain}:{subject}",
    owner: "API security",
    storage: "redis_state",
    ttlSeconds: 60,
  },
  twoFactorChallenges: {
    classification: "ephemeral_state",
    keyPattern: "linksnap:auth:2fa:challenge:{challengeId}",
    owner: "auth 2FA",
    storage: "redis_state",
    ttlSeconds: 5 * 60,
  },
} as const satisfies Record<string, EphemeralRedisPolicy>;

export const DO_NOT_CACHE_POLICIES = {
  adminMutationResults: {
    classification: "do_not_cache",
    owner: "admin",
    reason: "Admin writes must be strongly consistent and auditable.",
    storage: "none",
  },
  apiKeyPlaintext: {
    classification: "do_not_cache",
    owner: "API keys",
    reason: "Plaintext API keys must only exist at creation time.",
    storage: "none",
  },
  authSessions: {
    classification: "do_not_cache",
    owner: "auth",
    reason: "Session and authorization state must be validated through Auth.js and database checks.",
    storage: "none",
  },
  csrfOriginDecisions: {
    classification: "do_not_cache",
    owner: "proxy security",
    reason: "CSRF/origin decisions must be evaluated per request.",
    storage: "none",
  },
  passwordResetSecrets: {
    classification: "do_not_cache",
    owner: "auth recovery",
    reason: "Reset secrets are one-way hashes in Postgres with explicit expiry.",
    storage: "none",
  },
  paymentMutations: {
    classification: "do_not_cache",
    owner: "payments",
    reason: "Checkout creation and payment mutations must be idempotent, fresh, and provider-confirmed.",
    storage: "none",
  },
  rawAnalyticsEventLists: {
    classification: "do_not_cache",
    owner: "analytics",
    reason: "Raw event rows can contain PII-heavy metadata and must not be cached.",
    storage: "none",
  },
  superadminAuthorization: {
    classification: "do_not_cache",
    owner: "admin security",
    reason: "Superadmin authorization must be revalidated against the database.",
    storage: "none",
  },
  webhookVerificationOutcomes: {
    classification: "do_not_cache",
    owner: "payments",
    reason: "Webhook signatures and outcomes must be verified per request.",
    storage: "none",
  },
} as const satisfies Record<string, DoNotCachePolicy>;

export const FORBIDDEN_CACHE_HELPER_TERMS = [
  "admin-mutation-cache",
  "api-key-plaintext-cache",
  "auth-session-cache",
  "csrf-cache",
  "password-reset-cache",
  "payment-mutation-cache",
  "raw-analytics-events-cache",
  "session-cache",
  "superadmin-cache",
  "webhook-verification-cache",
] as const;
