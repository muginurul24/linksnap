import { describe, expect, it } from "vitest";
import {
  CSP_NONCE_HEADER,
  createContentSecurityPolicy,
  createCspNonce,
  createRequestSecurityHeaders,
  createSecurityHeaders,
  staticSecurityHeaders,
} from "@/lib/security/headers";

function getDirective(csp: string, directive: string): string {
  return (
    csp
      .split("; ")
      .find((value) => value.startsWith(`${directive} `)) ?? ""
  );
}

describe("security headers", () => {
  it("should include baseline browser hardening headers", () => {
    expect(staticSecurityHeaders).toEqual(
      expect.arrayContaining([
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        },
      ]),
    );
  });

  it("should create a base64 nonce from a random UUID", () => {
    expect(createCspNonce(() => "00000000-0000-4000-8000-000000000000")).toBe(
      "MDAwMDAwMDAtMDAwMC00MDAwLTgwMDAtMDAwMDAwMDAwMDAw",
    );
  });

  it("should build a nonce-based script CSP with client runtime style compatibility", () => {
    const csp = createContentSecurityPolicy({
      isDev: false,
      nonce: "test-nonce",
    });

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain(
      "script-src 'self' https://va.vercel-scripts.com 'nonce-test-nonce' 'strict-dynamic'",
    );
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain(
      "connect-src 'self' https://vitals.vercel-insights.com",
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(getDirective(csp, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("should allow unsafe eval only in development CSP", () => {
    expect(
      createContentSecurityPolicy({ isDev: true, nonce: "dev-nonce" }),
    ).toContain("'unsafe-eval'");
    expect(
      createContentSecurityPolicy({ isDev: false, nonce: "prod-nonce" }),
    ).not.toContain("'unsafe-eval'");
  });

  it("should attach matching nonce and CSP to request headers", () => {
    const security = createRequestSecurityHeaders(new Headers());
    const nonce = security.requestHeaders.get(CSP_NONCE_HEADER);
    const requestCsp = security.requestHeaders.get("Content-Security-Policy");

    expect(nonce).toBe(security.nonce);
    expect(requestCsp).toBe(security.contentSecurityPolicy);
    expect(security.contentSecurityPolicy).toContain(`'nonce-${nonce}'`);
  });

  it("should include CSP when creating full response headers", () => {
    expect(createSecurityHeaders({ isDev: false, nonce: "test-nonce" })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "Content-Security-Policy",
          value: expect.stringContaining("'nonce-test-nonce'"),
        }),
      ]),
    );
  });
});
