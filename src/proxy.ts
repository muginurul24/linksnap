import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isProtectedPath } from "@/lib/auth/protected-routes";
import {
  API_CSRF_HEADER,
  validateApiMutationRequest,
} from "@/lib/security/api-request";

const LOGIN_PATH = "/login";

const dashboardAuthProxy = auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname) || request.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
});

type MiddlewareHandler = (
  request: NextRequest,
  event: NextFetchEvent,
) => ReturnType<typeof dashboardAuthProxy>;

const runDashboardAuthProxy = dashboardAuthProxy as unknown as MiddlewareHandler;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const apiSecurityError = validateApiMutationRequest({
    authorization: request.headers.get("authorization"),
    method: request.method,
    origin: request.headers.get("origin"),
    pathname,
    requestedWith: request.headers.get(API_CSRF_HEADER),
  });

  if (apiSecurityError) {
    const requestId = crypto.randomUUID();

    return NextResponse.json(
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
    );
  }

  if (pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  return runDashboardAuthProxy(request, event);
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/((?!api/auth|api/v1/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
