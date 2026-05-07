import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";

describe("api response helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return success body when data is provided", async () => {
    const response = successResponse({ id: "link_123" }, 201);

    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: "link_123" },
    });
    expect(response.status).toBe(201);
  });

  it("should include request id in error body and header when error response is created", async () => {
    const response = errorResponse(
      "VALIDATION_ERROR",
      "Invalid input.",
      400,
      "req_test_123",
    );

    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input.",
        requestId: "req_test_123",
      },
    });
    expect(response.status).toBe(400);
    expect(response.headers.get("x-request-id")).toBe("req_test_123");
  });

  it("should log structured request id context for API errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error: new Error("database unavailable"),
      requestId: "req_internal_123",
      route: "GET /api/v1/test",
    });

    expect(consoleError).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      level: "error",
      message: "api_error_response",
      requestId: "req_internal_123",
      code: "INTERNAL_ERROR",
      route: "GET /api/v1/test",
      status: 500,
    });
    expect(payload.error).toMatchObject({
      message: "database unavailable",
      name: "Error",
    });
    expect(typeof payload.timestamp).toBe("string");
  });

  it("should create uuid request ids", () => {
    expect(createRequestId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
