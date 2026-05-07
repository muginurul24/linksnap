import { describe, expect, it } from "vitest";
import {
  API_CSRF_HEADER_VALUE,
  validateApiMutationRequest,
} from "@/lib/security/api-request";

const allowedOrigins = ["https://www.justqiu.cloud"];

describe("API mutation security", () => {
  it("should allow safe methods without CSRF headers", () => {
    const result = validateApiMutationRequest({
      allowedOrigins,
      method: "GET",
      origin: "https://attacker.test",
      pathname: "/api/v1/links",
      requestedWith: null,
    });

    expect(result).toBeNull();
  });

  it("should reject mutating API requests from untrusted origins", () => {
    const result = validateApiMutationRequest({
      allowedOrigins,
      method: "POST",
      origin: "https://attacker.test",
      pathname: "/api/v1/links",
      requestedWith: API_CSRF_HEADER_VALUE,
    });

    expect(result).toMatchObject({
      code: "FORBIDDEN_ORIGIN",
    });
  });

  it("should reject mutating API requests without the custom header", () => {
    const result = validateApiMutationRequest({
      allowedOrigins,
      method: "PATCH",
      origin: "https://www.justqiu.cloud",
      pathname: "/api/v1/links/link-id",
      requestedWith: null,
    });

    expect(result).toMatchObject({
      code: "CSRF_HEADER_REQUIRED",
    });
  });

  it("should allow trusted mutating API requests with the custom header", () => {
    const result = validateApiMutationRequest({
      allowedOrigins,
      method: "DELETE",
      origin: "https://www.justqiu.cloud",
      pathname: "/api/v1/links/link-id",
      requestedWith: API_CSRF_HEADER_VALUE,
    });

    expect(result).toBeNull();
  });

  it("should exempt Midtrans webhook callbacks from custom browser headers", () => {
    const result = validateApiMutationRequest({
      allowedOrigins,
      method: "POST",
      origin: null,
      pathname: "/api/v1/payments/webhook",
      requestedWith: null,
    });

    expect(result).toBeNull();
  });
});
