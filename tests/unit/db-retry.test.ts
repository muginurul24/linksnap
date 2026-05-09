import { readFileSync } from "node:fs";
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

  it("should keep enough default attempts for short Neon connection flaps", async () => {
    const transientError = new Error("Failed query: select links") as Error & {
      cause?: unknown;
    };
    transientError.cause = new TypeError("fetch failed");

    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce("ok");

    await expect(retryTransientDbQuery(operation, { delayMs: 0 })).resolves.toBe(
      "ok",
    );
    expect(operation).toHaveBeenCalledTimes(5);
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

  it("should guard dashboard link, campaign, and billing reads with transient retry", () => {
    const campaignsSource = readFileSync(
      "src/lib/db/queries/campaigns.ts",
      "utf8",
    );
    const linksSource = readFileSync("src/lib/db/queries/links.ts", "utf8");
    const paymentsSource = readFileSync(
      "src/lib/db/queries/payments.ts",
      "utf8",
    );

    expect(campaignsSource).toContain("retryTransientDbQuery");
    expect(campaignsSource).toContain("Promise.all([");
    expect(linksSource).toContain("listLinksByUserId");
    expect(linksSource).toContain("retryTransientDbQuery");
    expect(linksSource).toContain("listLinksWithTrendsByUserId");
    expect(paymentsSource).toContain("retryTransientDbQuery(() =>");
    expect(paymentsSource).toContain("db.query.users.findFirst");
  });
});
