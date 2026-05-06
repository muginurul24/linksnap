import { beforeEach, describe, expect, it, vi } from "vitest";

type InsertedClick = {
  linkId: string;
  referrer: string | null;
  userAgent: string | null;
};

const mockState = vi.hoisted(() => ({
  insertedClicks: [] as InsertedClick[],
  shouldThrow: false,
}));

vi.mock("@/lib/db/schema", () => ({
  clickEvents: Symbol("clickEvents"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: async (value: InsertedClick) => {
        if (mockState.shouldThrow) throw new Error("insert failed");
        mockState.insertedClicks.push(value);
      },
    }),
  },
}));

import { logRedirectClick } from "../../src/lib/analytics/click-logger";

describe("click logger", () => {
  beforeEach(() => {
    mockState.insertedClicks = [];
    mockState.shouldThrow = false;
    vi.restoreAllMocks();
  });

  it("should insert redirect click metadata when logging succeeds", async () => {
    await logRedirectClick({
      linkId: "link-1",
      referrer: "https://referrer.example",
      userAgent: "Mozilla/5.0",
    });

    expect(mockState.insertedClicks).toEqual([
      {
        linkId: "link-1",
        referrer: "https://referrer.example",
        userAgent: "Mozilla/5.0",
      },
    ]);
  });

  it("should swallow insert errors when database logging fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockState.shouldThrow = true;

    await expect(
      logRedirectClick({
        linkId: "link-1",
        referrer: null,
        userAgent: null,
      }),
    ).resolves.toBeUndefined();

    expect(mockState.insertedClicks).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      "[click-logger] failed to log redirect click",
      expect.any(Error),
    );
  });
});
