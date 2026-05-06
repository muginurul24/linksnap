import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ClickEventForAnalytics,
  NewClickEvent,
} from "../../src/lib/db/queries/click-events";

const mockState = vi.hoisted(() => ({
  insertedBatches: [] as NewClickEvent[][],
  queryCalls: [] as string[][],
}));

vi.mock("@/lib/db/schema", () => ({
  clickEvents: {
    browser: "browser",
    city: "city",
    country: "country",
    device: "device",
    eventType: "eventType",
    ipHash: "ipHash",
    linkPageHasCountdown: "linkPageHasCountdown",
    linkId: "linkId",
    referrer: "referrer",
    timestamp: "timestamp",
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: () => ({
      values: async (events: NewClickEvent[]) => {
        mockState.insertedBatches.push(events);
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: async () => {
            mockState.queryCalls.push(["select", "from", "where", "orderBy"]);
            return [
              {
                browser: "Chrome",
                city: "Jakarta",
                country: "ID",
                device: "desktop",
                eventType: "DIRECT_REDIRECT",
                ipHash: "a".repeat(64),
                linkPageHasCountdown: false,
                referrer: "https://referrer.example",
                timestamp: new Date("2026-05-06T10:00:00.000Z"),
              },
            ] satisfies ClickEventForAnalytics[];
          },
        }),
      }),
    }),
  },
}));

vi.mock("drizzle-orm", () => ({
  and: (...conditions: unknown[]) => conditions,
  desc: (column: unknown) => column,
  eq: (column: unknown, value: unknown) => ({ column, operator: "eq", value }),
  gte: (column: unknown, value: unknown) => ({ column, operator: "gte", value }),
  lte: (column: unknown, value: unknown) => ({ column, operator: "lte", value }),
}));

import {
  insertClickEvents,
  listClickEventsForLink,
} from "../../src/lib/db/queries/click-events";

describe("click event queries", () => {
  beforeEach(() => {
    mockState.insertedBatches = [];
    mockState.queryCalls = [];
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
        eventType: "DIRECT_REDIRECT",
        ipHash: "a".repeat(64),
        linkPageHasCountdown: false,
        linkId: "link-1",
        os: "Windows",
        referrer: "https://referrer.example",
        userAgent: "Mozilla/5.0",
      },
    ];

    await insertClickEvents(events);

    expect(mockState.insertedBatches).toEqual([events]);
  });

  it("should select analytics click events for one link and date range", async () => {
    await expect(
      listClickEventsForLink({
        from: new Date("2026-05-01T00:00:00.000Z"),
        linkId: "link-1",
        to: new Date("2026-05-06T00:00:00.000Z"),
      }),
    ).resolves.toEqual([
      {
        browser: "Chrome",
        city: "Jakarta",
        country: "ID",
        device: "desktop",
        eventType: "DIRECT_REDIRECT",
        ipHash: "a".repeat(64),
        linkPageHasCountdown: false,
        referrer: "https://referrer.example",
        timestamp: new Date("2026-05-06T10:00:00.000Z"),
      },
    ]);

    expect(mockState.queryCalls).toEqual([["select", "from", "where", "orderBy"]]);
  });
});
