import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewClickEvent } from "../../src/lib/db/queries/click-events";

const mockState = vi.hoisted(() => ({
  insertedBatches: [] as NewClickEvent[][],
}));

vi.mock("@/lib/db/schema", () => ({
  clickEvents: Symbol("clickEvents"),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: async (events: NewClickEvent[]) => {
        mockState.insertedBatches.push(events);
      },
    }),
  },
}));

import { insertClickEvents } from "../../src/lib/db/queries/click-events";

describe("click event queries", () => {
  beforeEach(() => {
    mockState.insertedBatches = [];
  });

  it("should skip database inserts when event batch is empty", async () => {
    await insertClickEvents([]);

    expect(mockState.insertedBatches).toEqual([]);
  });

  it("should insert click event batches", async () => {
    const events: NewClickEvent[] = [
      {
        browser: "Chrome",
        city: "Jakarta",
        country: "ID",
        device: "desktop",
        ipHash: "a".repeat(64),
        linkId: "link-1",
        os: "Windows",
        referrer: "https://referrer.example",
        userAgent: "Mozilla/5.0",
      },
    ];

    await insertClickEvents(events);

    expect(mockState.insertedBatches).toEqual([events]);
  });
});
