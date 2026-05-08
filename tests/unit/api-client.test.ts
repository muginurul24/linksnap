import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  apiFetch,
  getFriendlyApiErrorMessage,
  withBrowserMutationHeaders,
} from "@/lib/api/client";

describe("browser api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should add the browser mutation header to state-changing requests", () => {
    const init = withBrowserMutationHeaders({
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    const headers = init.headers as Headers;

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-requested-with")).toBe("XMLHttpRequest");
    expect(init.method).toBe("PATCH");
  });

  it("should not add the browser mutation header to safe requests", () => {
    const init = withBrowserMutationHeaders({ method: "GET" });
    const headers = init.headers as Headers;

    expect(headers.get("x-requested-with")).toBeNull();
  });

  it("should return data from standard success responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ success: true, data: { id: "user-1" } }, { status: 200 }),
      ),
    );

    await expect(apiFetch<{ id: string }>("/api/v1/test")).resolves.toEqual({
      id: "user-1",
    });
  });

  it("should expose code message and request id from standard error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            success: false,
            error: {
              code: "CSRF_HEADER_REQUIRED",
              message: "Missing required request header.",
              requestId: "req_123",
            },
          },
          { status: 403 },
        ),
      ),
    );

    await expect(apiFetch("/api/v1/test", { method: "PATCH" })).rejects.toMatchObject({
      code: "CSRF_HEADER_REQUIRED",
      message: "Missing required request header.",
      requestId: "req_123",
      status: 403,
    });
  });

  it("should produce a friendly message for known error codes", () => {
    const error = new ApiClientError({
      code: "SUPERADMIN_REQUIRED",
      message: "Superadmin access required.",
      requestId: "req_123",
      status: 403,
    });

    expect(getFriendlyApiErrorMessage(error)).toBe(
      "Your admin session is no longer authorized. Sign in again.",
    );
  });
});
