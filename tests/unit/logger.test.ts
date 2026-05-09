import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/observability/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("should write JSON structured error logs with serialized errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("api_error_response", {
      error: new Error("database unavailable"),
      requestId: "req_logger_123",
      route: "GET /api/v1/test",
    });

    expect(consoleError).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      level: "error",
      message: "api_error_response",
      requestId: "req_logger_123",
      route: "GET /api/v1/test",
      error: {
        message: "database unavailable",
        name: "Error",
      },
    });
    expect(typeof payload.timestamp).toBe("string");
    expect(typeof payload.error.stack).toBe("string");
  });

  it("should omit stack traces from production logs", () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("api_error_response", {
      error: new Error("database unavailable"),
      requestId: "req_logger_123",
      route: "GET /api/v1/test",
    });

    const payload = JSON.parse(String(consoleError.mock.calls[0]?.[0]));
    expect(payload.error).toEqual({
      message: "database unavailable",
      name: "Error",
    });
  });

  it("should redact sensitive log context fields", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("security_event", {
      authorization: "Bearer secret",
      nested: {
        passwordHash: "hash",
        token: "refresh-token",
      },
      requestId: "req_logger_456",
    });

    const payload = JSON.parse(String(consoleWarn.mock.calls[0]?.[0]));
    expect(payload).toMatchObject({
      authorization: "[REDACTED]",
      nested: {
        passwordHash: "[REDACTED]",
        token: "[REDACTED]",
      },
      requestId: "req_logger_456",
    });
  });
});
