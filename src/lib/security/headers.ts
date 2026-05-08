const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy";

export const CSP_NONCE_HEADER = "x-nonce";

export type CspInput = {
  isDev?: boolean;
  nonce: string;
};

export type RequestSecurityHeaders = {
  contentSecurityPolicy: string;
  nonce: string;
  requestHeaders: Headers;
};

const isDevelopment = () => process.env.NODE_ENV === "development";

function encodeNonce(value: string): string {
  if (typeof btoa === "function") return btoa(value);

  return Buffer.from(value).toString("base64");
}

export function createCspNonce(
  randomUUID: () => string = () => crypto.randomUUID(),
): string {
  return encodeNonce(randomUUID());
}

export function createContentSecurityPolicy({
  isDev = isDevelopment(),
  nonce,
}: CspInput): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const staticSecurityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
] as const;

export const securityHeaders = staticSecurityHeaders;

export function createSecurityHeaders(input: CspInput) {
  return [
    {
      key: CONTENT_SECURITY_POLICY_HEADER,
      value: createContentSecurityPolicy(input),
    },
    ...staticSecurityHeaders,
  ] as const;
}

export function createRequestSecurityHeaders(
  headers: Headers,
): RequestSecurityHeaders {
  const nonce = createCspNonce();
  const contentSecurityPolicy = createContentSecurityPolicy({ nonce });
  const requestHeaders = new Headers(headers);

  requestHeaders.set(CSP_NONCE_HEADER, nonce);
  requestHeaders.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy);

  return {
    contentSecurityPolicy,
    nonce,
    requestHeaders,
  };
}

export function applyContentSecurityPolicyHeader(
  response: Response,
  contentSecurityPolicy: string,
): Response {
  response.headers.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy);

  return response;
}
