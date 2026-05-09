import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  expires: [] as Array<{ key: string; seconds: number }>,
  increments: [] as string[],
  values: new Map<string, number | string | null>(),
  writes: [] as Array<{ key: string; options?: { ex?: number }; value: string }>,
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    expire: async (key: string, seconds: number) => {
      mockState.expires.push({ key, seconds });
    },
    get: async (key: string) => mockState.values.get(key) ?? null,
    incr: async (key: string) => {
      mockState.increments.push(key);
      const current = Number(mockState.values.get(key) ?? 0);
      mockState.values.set(key, current + 1);
      return current + 1;
    },
    set: async (key: string, value: string, options?: { ex?: number }) => {
      mockState.writes.push({ key, options, value });
    },
  },
}));

import {
  getRecentApiErrorCount,
  recordApiErrorMetric,
  recordTimingMetric,
} from "@/lib/observability/instrumentation";

describe("observability instrumentation", () => {
  beforeEach(() => {
    mockState.expires = [];
    mockState.increments = [];
    mockState.values = new Map();
    mockState.writes = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should increment minute-bucketed API error counters", async () => {
    const timestamp = new Date("2026-05-09T10:00:30.000Z");

    await recordApiErrorMetric({
      code: "INTERNAL_ERROR",
      requestId: "req_metric_1",
      route: "GET /api/v1/test",
      status: 500,
      timestamp,
    });

    expect(mockState.increments).toEqual(["linksnap:metrics:api-errors:29638680"]);
    expect(mockState.expires).toEqual([
      { key: "linksnap:metrics:api-errors:29638680", seconds: 3600 },
    ]);
  });

  it("should sum recent API error buckets", async () => {
    mockState.values.set("linksnap:metrics:api-errors:29638680", 2);
    mockState.values.set("linksnap:metrics:api-errors:29638679", "3");

    await expect(
      getRecentApiErrorCount({
        timestamp: new Date("2026-05-09T10:00:30.000Z"),
        windowMinutes: 2,
      }),
    ).resolves.toBe(5);
  });

  it("should log and store the latest critical timing metric", async () => {
    const consoleInfo = vi.spyOn(console, "log").mockImplementation(() => {});

    await recordTimingMetric({
      durationMs: 42,
      name: "redirect.resolve",
      requestId: "req_metric_2",
      tags: { outcome: "redirect" },
      timestamp: new Date("2026-05-09T10:01:00.000Z"),
    });

    expect(mockState.writes).toHaveLength(1);
    expect(mockState.writes[0]).toMatchObject({
      key: "linksnap:metrics:timing:last:redirect.resolve",
      options: { ex: 86_400 },
    });
    expect(JSON.parse(mockState.writes[0]?.value ?? "{}")).toMatchObject({
      durationMs: 42,
      name: "redirect.resolve",
      requestId: "req_metric_2",
      tags: { outcome: "redirect" },
      timestamp: "2026-05-09T10:01:00.000Z",
    });

    const logPayload = JSON.parse(String(consoleInfo.mock.calls[0]?.[0]));
    expect(logPayload).toMatchObject({
      durationMs: 42,
      level: "info",
      message: "timing_metric_recorded",
      name: "redirect.resolve",
      requestId: "req_metric_2",
    });
  });
});
