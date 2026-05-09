import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  apiErrors: 0,
  databaseFails: false,
  redisFails: false,
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: async () => {
          if (mockState.databaseFails) throw new Error("database unavailable");
          return { id: "user_1" };
        },
      },
    },
  },
}));

vi.mock("@/lib/db/retry", () => ({
  retryTransientDbQuery: async <T>(operation: () => Promise<T>) => operation(),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    ping: async () => {
      if (mockState.redisFails) throw new Error("redis unavailable");
      return "PONG";
    },
  },
}));

vi.mock("@/lib/observability/instrumentation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/observability/instrumentation")>(
    "@/lib/observability/instrumentation",
  );

  return {
    ...actual,
    getRecentApiErrorCount: async () => mockState.apiErrors,
  };
});

import { GET } from "@/app/api/v1/health/route";

describe("health API", () => {
  beforeEach(() => {
    mockState.apiErrors = 0;
    mockState.databaseFails = false;
    mockState.redisFails = false;
  });

  it("should return ok status when database and Redis checks pass", async () => {
    mockState.apiErrors = 2;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(body).toMatchObject({
      success: true,
      data: {
        checks: {
          apiErrorsLastFiveMinutes: 2,
          database: { status: "ok" },
          redis: { status: "ok" },
        },
        service: "linksnap",
        status: "ok",
      },
    });
    expect(typeof body.data.timestamp).toBe("string");
    expect(typeof body.data.uptimeSeconds).toBe("number");
  });

  it("should return degraded status when a dependency check fails", async () => {
    mockState.redisFails = true;

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      success: true,
      data: {
        checks: {
          database: { status: "ok" },
          redis: {
            message: "redis unavailable",
            status: "error",
          },
        },
        status: "degraded",
      },
    });
  });
});
