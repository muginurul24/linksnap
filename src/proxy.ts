import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isProtectedPath } from "@/lib/auth/protected-routes";

const LOGIN_PATH = "/login";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname) || request.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL(LOGIN_PATH, request.nextUrl.origin);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: [
    "/((?!api/auth|api/v1/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
