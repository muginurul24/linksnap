export type ApiAuthKind =
  | "API key"
  | "Cron secret"
  | "PayGate signature"
  | "Public"
  | "Session"
  | "Superadmin session";

export type ApiEndpointDoc = {
  auth: ApiAuthKind;
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
  rateLimit: string;
  requestExample?: Record<string, unknown>;
  responseExample: Record<string, unknown>;
  summary: string;
};

export type ApiDocSection = {
  description: string;
  endpoints: ApiEndpointDoc[];
  title: string;
};

const PLAN_RATE_LIMIT = "Plan limit: Free 30/min, Pro 60/min, Business 120/min";
const AUTH_RATE_LIMIT = "Endpoint-specific auth limit";
const PUBLIC_QR_RATE_LIMIT = "120/min per IP";
const WEBHOOK_RATE_LIMIT = "Provider controlled";
const CRON_RATE_LIMIT = "Operational cron only";
const ADMIN_RATE_LIMIT = "Superadmin dashboard guard";

export const API_DOC_SECTIONS: ApiDocSection[] = [
  {
    description: "Account and credential flows used by the app and API clients.",
    endpoints: [
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/register",
        rateLimit: "3/IP/hour",
        requestExample: { email: "user@example.com", name: "Rafi", password: "••••••••" },
        responseExample: { success: true },
        summary: "Create an account and send an OTP verification email.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/login",
        rateLimit: "5/IP/15min",
        requestExample: { email: "user@example.com", password: "••••••••" },
        responseExample: { data: { requiresTwoFactor: false }, success: true },
        summary: "Authenticate with email and password.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/verify",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456", email: "user@example.com" },
        responseExample: { success: true },
        summary: "Verify a pending account email address.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/verify-new-email",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456", token: "email-change-token" },
        responseExample: { success: true },
        summary: "Verify a requested account email change.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/resend-otp",
        rateLimit: "3/email/hour",
        requestExample: { email: "user@example.com" },
        responseExample: { success: true },
        summary: "Resend a verification OTP.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/forgot-password",
        rateLimit: "3/email/hour",
        requestExample: { email: "user@example.com" },
        responseExample: { success: true },
        summary: "Send a password reset email without revealing account existence.",
      },
      {
        auth: "Public",
        method: "POST",
        path: "/api/v1/auth/reset-password",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { password: "••••••••", token: "reset-token" },
        responseExample: { success: true },
        summary: "Reset a password using a valid reset token.",
      },
      {
        auth: "Session",
        method: "GET",
        path: "/api/v1/auth/me",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { email: "user@example.com", id: "user-id", plan: "PRO" }, success: true },
        summary: "Return the authenticated session user.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/refresh",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { success: true },
        summary: "Refresh the authenticated session state.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/logout",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { success: true },
        summary: "Clear the authenticated session.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/change-password",
        rateLimit: "5/user/15min",
        requestExample: { confirmPassword: "••••••••", currentPassword: "••••••••", password: "••••••••" },
        responseExample: { success: true },
        summary: "Change the authenticated user's password.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/change-email",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { email: "new@example.com", password: "••••••••" },
        responseExample: { success: true },
        summary: "Request an email address change for the authenticated user.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/delete-account",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { confirm: "DELETE", password: "••••••••" },
        responseExample: { success: true },
        summary: "Permanently delete the authenticated account and owned data.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/docs",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { openapi: "3.1.0" }, success: true },
        summary: "Return the LinkSnap OpenAPI JSON document.",
      },
      {
        auth: "Session",
        method: "GET",
        path: "/api/v1/settings/api-keys",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ id: "key-id", keyPrefix: "lsnap_sk_abcd1234" }], success: true },
        summary: "List API keys for the authenticated paid user.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/settings/api-keys",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { name: "Production integration" },
        responseExample: { data: { apiKey: { id: "key-id" }, maskedKey: "lsnap_sk_abcd1234...wxyz" }, success: true },
        summary: "Create an API key and return the secret once.",
      },
      {
        auth: "Session",
        method: "DELETE",
        path: "/api/v1/settings/api-keys/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { deleted: true, id: "key-id" }, success: true },
        summary: "Revoke one owned API key.",
      },
      {
        auth: "Session",
        method: "PATCH",
        path: "/api/v1/settings/profile",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { name: "Rafi" },
        responseExample: { data: { email: "user@example.com", name: "Rafi" }, success: true },
        summary: "Update the authenticated user's profile.",
      },
      {
        auth: "Session",
        method: "PATCH",
        path: "/api/v1/settings/notifications",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { linkPerformanceAlerts: true, paymentConfirmations: true, productUpdates: true, weeklyAnalyticsReport: true },
        responseExample: { data: { notifications: { weeklyAnalyticsReport: true } }, success: true },
        summary: "Update the authenticated user's notification preferences.",
      },
    ],
    title: "Authentication",
  },
  {
    description: "Enroll, challenge, verify, and disable two-factor authentication.",
    endpoints: [
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/2fa/setup",
        rateLimit: AUTH_RATE_LIMIT,
        responseExample: { data: { otpauthUrl: "otpauth://totp/LinkSnap:user@example.com" }, success: true },
        summary: "Start TOTP enrollment for the authenticated user.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/2fa/challenge",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { email: "user@example.com", password: "••••••••" },
        responseExample: { data: { challengeId: "challenge-id" }, success: true },
        summary: "Create a 2FA login challenge after password verification.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/2fa/verify",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456" },
        responseExample: { data: { backupCodes: ["ABCD-EFGH"] }, success: true },
        summary: "Verify a TOTP code and enable 2FA.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/2fa/backup-codes",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456" },
        responseExample: { data: { backupCodes: ["ABCD-EFGH"] }, success: true },
        summary: "Regenerate backup codes for an enrolled user.",
      },
      {
        auth: "Session",
        method: "POST",
        path: "/api/v1/auth/2fa/disable",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456", password: "••••••••" },
        responseExample: { success: true },
        summary: "Disable 2FA after password and code verification.",
      },
    ],
    title: "Two-Factor Authentication",
  },
  {
    description: "Create, list, update, and inspect short links.",
    endpoints: [
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ id: "link-id", slug: "promo" }], success: true },
        summary: "List links with pagination, search, and campaign filters.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/links",
        rateLimit: "Create limit: Free 10/min, Pro 30/min, Business 60/min",
        requestExample: { destinationUrl: "https://example.com", slug: "promo" },
        responseExample: { data: { id: "link-id", shortUrl: "https://www.justqiu.cloud/promo" }, success: true },
        summary: "Create a short link.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { id: "link-id", slug: "promo" }, success: true },
        summary: "Read one owned link.",
      },
      {
        auth: "API key",
        method: "PATCH",
        path: "/api/v1/links/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { destinationUrl: "https://example.com/new" },
        responseExample: { data: { id: "link-id", slug: "promo" }, success: true },
        summary: "Update an owned link.",
      },
      {
        auth: "API key",
        method: "DELETE",
        path: "/api/v1/links/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { deleted: true, id: "link-id" }, success: true },
        summary: "Soft delete an owned link.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/slug/{slug}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { available: true, slug: "promo" }, success: true },
        summary: "Check slug availability and plan access.",
      },
    ],
    title: "Links API",
  },
  {
    description: "Attach branded Link Pages to short links.",
    endpoints: [
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/pages",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: {
          data: [{ ctaClicks: 10, id: "page-id", pageViews: 120, slug: "promo" }],
          success: true,
        },
        summary: "List owned Link Pages with view and CTA click totals.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/{id}/page",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { brandName: "LinkSnap", title: "Promo" }, success: true },
        summary: "Read a link page configuration.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/links/{id}/page",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { brandName: "LinkSnap", ctaText: "Continue", title: "Promo" },
        responseExample: { data: { id: "page-id", title: "Promo" }, success: true },
        summary: "Create or update a link page.",
      },
    ],
    title: "Link Pages API",
  },
  {
    description: "Organize links into UTM-backed campaign groups.",
    endpoints: [
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/campaigns",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ id: "campaign-id", slug: "launch" }], success: true },
        summary: "List owned campaigns.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/campaigns",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { name: "Launch", slug: "launch", utmSource: "newsletter" },
        responseExample: { data: { id: "campaign-id", slug: "launch" }, success: true },
        summary: "Create a campaign within plan quota.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/campaigns/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { id: "campaign-id", linkCount: 3 }, success: true },
        summary: "Read one owned campaign.",
      },
      {
        auth: "API key",
        method: "PATCH",
        path: "/api/v1/campaigns/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { name: "Updated Launch" },
        responseExample: { data: { id: "campaign-id", name: "Updated Launch" }, success: true },
        summary: "Update an owned campaign.",
      },
      {
        auth: "API key",
        method: "DELETE",
        path: "/api/v1/campaigns/{id}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { deleted: true, id: "campaign-id" }, success: true },
        summary: "Delete an owned campaign.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/campaigns/{id}/links",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ id: "link-id", slug: "promo" }], success: true },
        summary: "List links assigned to a campaign.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/campaigns/{id}/links",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { linkIds: ["link-id"] },
        responseExample: { data: { updated: 1 }, success: true },
        summary: "Assign links to a campaign and apply UTM params.",
      },
      {
        auth: "API key",
        method: "DELETE",
        path: "/api/v1/campaigns/{id}/links",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { linkId: "link-id" },
        responseExample: { data: { removed: true }, success: true },
        summary: "Remove a link from a campaign.",
      },
    ],
    title: "Campaigns API",
  },
  {
    description: "Generate dynamic QR codes for short links.",
    endpoints: [
      {
        auth: "Public",
        method: "GET",
        path: "/api/v1/qr/{slug}",
        rateLimit: PUBLIC_QR_RATE_LIMIT,
        responseExample: { contentType: "image/png" },
        summary: "Generate PNG or SVG QR code content for an active link.",
      },
    ],
    title: "QR API",
  },
  {
    description: "Read link, campaign, and dashboard analytics.",
    endpoints: [
      {
        auth: "Session",
        method: "GET",
        path: "/api/v1/analytics",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: {
          data: {
            range: { key: "30", maxDays: 30, retentionDays: 30 },
            summary: {
              linkPageAnalytics: {
                ctaClickThroughRate: 0.24,
                ctaClicks: 24,
                directRedirects: 80,
                pageViews: 100,
              },
              topLinks: [{ id: "link-id", slug: "promo", totalClicks: 42 }],
              totalClicks: 180,
              uniqueVisitors: 132,
            },
          },
          success: true,
        },
        summary: "Read dashboard-wide analytics for the authenticated user.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/dashboard/overview",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { totalLinks: 10 }, success: true },
        summary: "Read dashboard overview aggregates.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/{id}/analytics",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { totalClicks: 120 }, success: true },
        summary: "Read analytics for one owned link.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/campaigns/{id}/analytics",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { totalClicks: 120 }, success: true },
        summary: "Read analytics for one owned campaign.",
      },
    ],
    title: "Analytics API",
  },
  {
    description: "Configure redirect rules and A/B split tests.",
    endpoints: [
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/{id}/rules",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ type: "GEO" }], success: true },
        summary: "List smart rules for one owned link.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/links/{id}/rules",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { rules: [{ condition: { country: "ID" }, destinationUrl: "https://example.com/id", type: "GEO" }] },
        responseExample: { data: [{ type: "GEO" }], success: true },
        summary: "Replace smart rules within plan quota.",
      },
      {
        auth: "API key",
        method: "PUT",
        path: "/api/v1/links/{id}/rules",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { rules: [{ condition: { country: "ID" }, destinationUrl: "https://example.com/id", type: "GEO" }] },
        responseExample: { data: [{ type: "GEO" }], success: true },
        summary: "Replace smart rules within plan quota using the PUT alias.",
      },
      {
        auth: "API key",
        method: "DELETE",
        path: "/api/v1/links/{id}/rules",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { ruleId: "rule-id" },
        responseExample: { data: { deleted: true }, success: true },
        summary: "Delete one smart rule.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/links/{id}/split-test",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { variants: [] }, success: true },
        summary: "Read split test variants for one owned link.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/links/{id}/split-test",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { variants: [{ destinationUrl: "https://example.com/a", weight: 50 }] },
        responseExample: { data: { variants: [] }, success: true },
        summary: "Replace split test variants.",
      },
      {
        auth: "API key",
        method: "DELETE",
        path: "/api/v1/links/{id}/split-test",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { deleted: true }, success: true },
        summary: "Disable split testing for one owned link.",
      },
    ],
    title: "Smart Rules API",
  },
  {
    description: "Create checkouts, inspect billing history, and process provider callbacks.",
    endpoints: [
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/payments/create",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { duration: "MONTHLY", plan: "PRO" },
        responseExample: { data: { orderId: "order-id", redirectUrl: "/checkout/success?order_id=order-id", vaNumbers: [] }, success: true },
        summary: "Create a PayGate checkout transaction.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/payments/history",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: [{ orderId: "order-id", status: "SETTLEMENT" }], success: true },
        summary: "List billing transactions.",
      },
      {
        auth: "API key",
        method: "GET",
        path: "/api/v1/payments/{orderId}",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { orderId: "order-id", status: "SETTLEMENT" }, success: true },
        summary: "Read one owned payment transaction.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/payments/subscriptions/cancel",
        rateLimit: PLAN_RATE_LIMIT,
        requestExample: { reason: "Switching plans" },
        responseExample: { data: { canceled: true }, success: true },
        summary: "Cancel the authenticated user's active subscription.",
      },
      {
        auth: "API key",
        method: "POST",
        path: "/api/v1/payments/subscriptions/reactivate",
        rateLimit: PLAN_RATE_LIMIT,
        responseExample: { data: { reactivated: true }, success: true },
        summary: "Reactivate a canceled subscription before the period ends.",
      },
      {
        auth: "Cron secret",
        method: "GET",
        path: "/api/v1/payments/subscriptions/renew",
        rateLimit: CRON_RATE_LIMIT,
        responseExample: { data: { expiredSubscriptions: 0 }, success: true },
        summary: "Expire due subscriptions from a trusted scheduler.",
      },
      {
        auth: "PayGate signature",
        method: "POST",
        path: "/api/v1/payments/webhook",
        rateLimit: WEBHOOK_RATE_LIMIT,
        requestExample: { amount: 128000, order_id: "order-id", status: "paid" },
        responseExample: { data: { status: "SETTLEMENT" }, success: true },
        summary: "Process PayGate payment callbacks.",
      },
    ],
    title: "Payments API",
  },
  {
    description: "Operational endpoints for health checks and background jobs.",
    endpoints: [
      {
        auth: "Public",
        method: "GET",
        path: "/api/v1/health",
        rateLimit: "Public health probe",
        responseExample: { data: { database: "ok", redis: "ok", status: "ok" }, success: true },
        summary: "Return production readiness signals for the app, database, and Redis.",
      },
      {
        auth: "Cron secret",
        method: "GET",
        path: "/api/v1/analytics/click-queue/process",
        rateLimit: CRON_RATE_LIMIT,
        responseExample: { data: { processed: 10 }, success: true },
        summary: "Process queued click analytics from the trusted scheduler.",
      },
    ],
    title: "Operations API",
  },
  {
    description: "Superadmin-only user, billing, analytics, and audit operations.",
    endpoints: [
      {
        auth: "Superadmin session",
        method: "GET",
        path: "/api/v1/admin/analytics",
        rateLimit: ADMIN_RATE_LIMIT,
        responseExample: { data: { totalUsers: 100 }, success: true },
        summary: "Read cached platform analytics for superadmin dashboards.",
      },
      {
        auth: "Superadmin session",
        method: "GET",
        path: "/api/v1/admin/audit-log",
        rateLimit: ADMIN_RATE_LIMIT,
        responseExample: { data: [{ action: "user.plan.change", id: "audit-id" }], success: true },
        summary: "List admin audit log entries with pagination.",
      },
      {
        auth: "Superadmin session",
        method: "GET",
        path: "/api/v1/admin/users",
        rateLimit: ADMIN_RATE_LIMIT,
        responseExample: { data: [{ email: "user@example.com", id: "user-id", plan: "PRO" }], success: true },
        summary: "List users with search, plan filters, and pagination.",
      },
      {
        auth: "Superadmin session",
        method: "GET",
        path: "/api/v1/admin/users/{id}",
        rateLimit: ADMIN_RATE_LIMIT,
        responseExample: { data: { email: "user@example.com", id: "user-id", plan: "PRO" }, success: true },
        summary: "Read one user's admin detail view.",
      },
      {
        auth: "Superadmin session",
        method: "PATCH",
        path: "/api/v1/admin/users/{id}",
        rateLimit: ADMIN_RATE_LIMIT,
        requestExample: { plan: "BUSINESS" },
        responseExample: { data: { plan: "BUSINESS", previousPlan: "FREE" }, success: true },
        summary: "Override a user's plan after superadmin confirmation.",
      },
      {
        auth: "Superadmin session",
        method: "POST",
        path: "/api/v1/admin/users/{id}",
        rateLimit: ADMIN_RATE_LIMIT,
        requestExample: { action: "suspend" },
        responseExample: { data: { action: "suspend" }, success: true },
        summary: "Suspend or unsuspend a user account.",
      },
    ],
    title: "Admin API",
  },
];

export function getAllApiEndpoints(): ApiEndpointDoc[] {
  return API_DOC_SECTIONS.flatMap((section) => section.endpoints);
}

function getOperationId(endpoint: ApiEndpointDoc): string {
  // Keep generated operation IDs deterministic so docs diffs stay reviewable.
  const suffix = endpoint.path
    .replace(/^\/api\/v1\//, "")
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9]+/g, " "))
    .flatMap((part) => part.split(" "))
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");

  return `${endpoint.method.toLowerCase()}${suffix}`;
}

export function createOpenApiSpec() {
  // The dashboard docs and JSON route share this single source of truth.
  const paths = getAllApiEndpoints().reduce<Record<string, Record<string, unknown>>>(
    (accumulator, endpoint) => {
      const pathItem = accumulator[endpoint.path] ?? {};
      pathItem[endpoint.method.toLowerCase()] = {
        description: endpoint.summary,
        operationId: getOperationId(endpoint),
        responses: {
          "200": {
            description: "Successful response",
          },
          "400": {
            description: "Validation error",
          },
          "401": {
            description: "Authentication required",
          },
          "403": {
            description: "Plan or ownership restriction",
          },
          "429": {
            description: "Rate limited",
          },
        },
        security:
          endpoint.auth === "API key"
            ? [{ bearerAuth: [] }]
            : endpoint.auth === "Cron secret"
              ? [{ cronSecret: [] }]
              : endpoint.auth === "Session" || endpoint.auth === "Superadmin session"
                ? [{ sessionCookie: [] }]
              : [],
        summary: endpoint.summary,
        tags: [
          API_DOC_SECTIONS.find((section) =>
            section.endpoints.includes(endpoint),
          )?.title ?? "API",
        ],
      };
      accumulator[endpoint.path] = pathItem;
      return accumulator;
    },
    {},
  );

  return {
    components: {
      securitySchemes: {
        bearerAuth: {
          bearerFormat: "LinkSnap API key",
          scheme: "bearer",
          type: "http",
        },
        cronSecret: {
          in: "header",
          name: "Authorization",
          type: "apiKey",
        },
        sessionCookie: {
          in: "cookie",
          name: "authjs.session-token",
          type: "apiKey",
        },
      },
    },
    info: {
      title: "LinkSnap API",
      version: "1.0.0",
    },
    openapi: "3.1.0",
    paths,
    servers: [
      {
        url: "https://www.justqiu.cloud",
      },
    ],
    tags: API_DOC_SECTIONS.map((section) => ({
      description: section.description,
      name: section.title,
    })),
  };
}
