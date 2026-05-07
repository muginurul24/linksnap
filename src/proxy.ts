import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import { isPublicSlug } from "@/lib/links/redirect";
import {
  API_CSRF_HEADER,
  validateApiMutationRequest,
} from "@/lib/security/api-request";
import {
  checkRedirectRateLimit,
  createRedirectRateLimitResponse,
} from "@/lib/security/redirect-rate-limit";
import {
  applyContentSecurityPolicyHeader,
  createRequestSecurityHeaders,
} from "@/lib/security/headers";

const LOGIN_PATH = "/login";
const RESERVED_PUBLIC_REDIRECT_SEGMENTS = new Set([
  "2fa",
  "analytics",
  "api",
  "blog",
  "campaigns",
  "checkout",
  "dashboard",
  "docs",
  "forgot-password",
  "help",
  "links",
  "login",
  "pages",
  "pricing",
  "privacy",
  "qr",
  "register",
  "reset-password",
  "settings",
  "terms",
  "verify",
]);

const dashboardAuthProxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const security = createRequestSecurityHeaders(request.headers);

  if (!isProtectedPath(pathname) || request.auth) {
    return createNextResponseWithSecurityHeaders(security);
  }

  const loginUrl = new URL(LOGIN_PATH, request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return applyContentSecurityPolicyHeader(
    NextResponse.redirect(loginUrl),
    security.contentSecurityPolicy,
  );
});

type MiddlewareHandler = (
  request: NextRequest,
  event: NextFetchEvent,
) => ReturnType<typeof dashboardAuthProxy>;

const runDashboardAuthProxy = dashboardAuthProxy as unknown as MiddlewareHandler;

function getPublicRedirectSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length !== 1) return null;

  const [slug] = segments;
  if (!slug || RESERVED_PUBLIC_REDIRECT_SEGMENTS.has(slug)) return null;

  return isPublicSlug(slug) ? slug : null;
}

function createNextResponseWithSecurityHeaders(
  security: ReturnType<typeof createRequestSecurityHeaders>,
): NextResponse {
  const response = NextResponse.next({
    request: {
      headers: security.requestHeaders,
    },
  });

  response.headers.set(
    "Content-Security-Policy",
    security.contentSecurityPolicy,
  );

  return response;
}

export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const { pathname } = request.nextUrl;
  const security = createRequestSecurityHeaders(request.headers);
  const apiSecurityError = validateApiMutationRequest({
    authorization: request.headers.get("authorization"),
    method: request.method,
    origin: request.headers.get("origin"),
    pathname,
    requestedWith: request.headers.get(API_CSRF_HEADER),
  });

  if (apiSecurityError) {
    const requestId = crypto.randomUUID();

    return applyContentSecurityPolicyHeader(
      NextResponse.json(
        {
          success: false,
          error: {
            code: apiSecurityError.code,
            message: apiSecurityError.message,
            requestId,
          },
        },
        {
          headers: {
            "x-request-id": requestId,
          },
          status: 403,
        },
      ),
      security.contentSecurityPolicy,
    );
  }

  if (request.method === "GET" && getPublicRedirectSlug(pathname)) {
    const rateLimit = await checkRedirectRateLimit({
      headers: request.headers,
      kind: "slug",
    });
    if (rateLimit.limited) {
      return applyContentSecurityPolicyHeader(
        createRedirectRateLimitResponse(rateLimit),
        security.contentSecurityPolicy,
      );
    }
  }

  if (pathname.startsWith("/api/v1/")) {
    return createNextResponseWithSecurityHeaders(security);
  }

  if (!isProtectedPath(pathname)) {
    return createNextResponseWithSecurityHeaders(security);
  }

  return runDashboardAuthProxy(request, event);
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/((?!api/auth|api/v1/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
