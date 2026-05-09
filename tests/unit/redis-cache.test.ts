import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  deletedKeys: [] as string[],
  errors: [] as Array<{ context?: Record<string, unknown>; message: string }>,
  storedValues: new Map<string, unknown>(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(function Redis() {
    return {
    del: async (key: string) => {
      mockState.deletedKeys.push(key);
      mockState.storedValues.delete(key);
    },
    get: async (key: string) => mockState.storedValues.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mockState.storedValues.set(key, value);
    },
    };
  }),
}));

vi.mock("@/lib/observability/logger", () => ({
  logger: {
    error: (message: string, context?: Record<string, unknown>) => {
      mockState.errors.push({ context, message });
    },
  },
}));

import { cacheDelete, cacheGet, cacheSet } from "@/lib/redis";

describe("redis cache helpers", () => {
  beforeEach(() => {
    mockState.deletedKeys = [];
    mockState.errors = [];
    mockState.storedValues = new Map();
  });

  it("should read JSON encoded cache values when present", async () => {
    await cacheSet("analytics:payload", { clicks: 7 });

    await expect(cacheGet<{ clicks: number }>("analytics:payload")).resolves.toEqual({
      clicks: 7,
    });
    expect(mockState.errors).toEqual([]);
  });

  it("should read legacy raw cache version tokens without logging parse errors", async () => {
    mockState.storedValues.set("linksnap:analytics:dashboard:global:version", "moxt8zwp");

    await expect(
      cacheGet<string>("analytics:dashboard:global:version"),
    ).resolves.toBe("moxt8zwp");
    expect(mockState.errors).toEqual([]);
  });

  it("should return null and log unsafe malformed cache strings", async () => {
    mockState.storedValues.set("linksnap:analytics:payload", "{not-json");

    await expect(cacheGet("analytics:payload")).resolves.toBeNull();
    expect(mockState.errors).toEqual([
      {
        context: expect.objectContaining({ key: "analytics:payload" }),
        message: "redis_cache_get_failed",
      },
    ]);
  });

  it("should delete prefixed cache keys", async () => {
    mockState.storedValues.set("linksnap:analytics:payload", JSON.stringify({ clicks: 7 }));

    await cacheDelete("analytics:payload");

    expect(mockState.deletedKeys).toEqual(["linksnap:analytics:payload"]);
    await expect(cacheGet("analytics:payload")).resolves.toBeNull();
  });
});
