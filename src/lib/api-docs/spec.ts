export type ApiAuthKind =
  | "API key"
  | "Cron secret"
  | "Midtrans signature"
  | "Public"
  | "Session";

export type ApiEndpointDoc = {
  auth: ApiAuthKind;
  method: "DELETE" | "GET" | "PATCH" | "POST";
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
        path: "/api/v1/auth/verify",
        rateLimit: AUTH_RATE_LIMIT,
        requestExample: { code: "123456", email: "user@example.com" },
        responseExample: { success: true },
        summary: "Verify a pending account email address.",
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
        method: "POST",
        path: "/api/v1/auth/change-password",
        rateLimit: "5/user/15min",
        requestExample: { confirmPassword: "••••••••", currentPassword: "••••••••", password: "••••••••" },
        responseExample: { success: true },
        summary: "Change the authenticated user's password.",
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
        responseExample: { data: { redirectUrl: "https://app.midtrans.com/..." }, success: true },
        summary: "Create a Midtrans Snap checkout transaction.",
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
        auth: "Cron secret",
        method: "GET",
        path: "/api/v1/payments/subscriptions/renew",
        rateLimit: CRON_RATE_LIMIT,
        responseExample: { data: { expiredSubscriptions: 0 }, success: true },
        summary: "Expire due subscriptions from a trusted scheduler.",
      },
      {
        auth: "Midtrans signature",
        method: "POST",
        path: "/api/v1/payments/webhook",
        rateLimit: WEBHOOK_RATE_LIMIT,
        requestExample: { order_id: "order-id", transaction_status: "settlement" },
        responseExample: { data: { status: "SETTLEMENT" }, success: true },
        summary: "Process Midtrans payment notifications.",
      },
    ],
    title: "Payments API",
  },
];

export function getAllApiEndpoints(): ApiEndpointDoc[] {
  return API_DOC_SECTIONS.flatMap((section) => section.endpoints);
}

function getOperationId(endpoint: ApiEndpointDoc): string {
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
              : endpoint.auth === "Session"
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
