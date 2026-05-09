import { describe, expect, it, vi } from "vitest";
import { retryTransientDbQuery } from "@/lib/db/retry";

describe("retryTransientDbQuery", () => {
  it("should retry transient database errors", async () => {
    const transientError = new Error("Failed query: update users") as Error & {
      cause?: unknown;
    };
    transientError.cause = new TypeError("fetch failed");

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce("ok");

    await expect(
      retryTransientDbQuery(operation, { attempts: 2, delayMs: 0 }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("should not retry non-transient database errors", async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error("duplicate key value violates unique constraint"));

    await expect(
      retryTransientDbQuery(operation, { attempts: 3, delayMs: 0 }),
    ).rejects.toThrow("duplicate key");
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
