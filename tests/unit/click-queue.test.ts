import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RedirectClickInput } from "@/lib/analytics/click-logger";

const sampleInput: RedirectClickInput = {
  edgeGeo: {
    city: null,
    country: null,
  },
  eventType: "DIRECT_REDIRECT",
  ipAddress: "203.0.113.10",
  linkId: "link-1",
  linkPageHasCountdown: false,
  referrer: "https://referrer.example",
  ruleId: null,
  userAgent: "Vitest",
};

const mockState = vi.hoisted(() => ({
  deadLetters: [] as string[],
  increments: [] as Array<{ currentClickCount?: number; linkId: string }>,
  ltrimCalls: [] as Array<{ end: number; key: string; start: number }>,
  queue: [] as unknown[],
  rpushThrows: false,
  persisted: [] as RedirectClickInput[],
  persistThrows: false,
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    lpop: async () => mockState.queue.shift() ?? null,
    ltrim: async (key: string, start: number, end: number) => {
      mockState.ltrimCalls.push({ end, key, start });
    },
    rpush: async (key: string, value: unknown) => {
      if (mockState.rpushThrows) throw new Error("redis unavailable");
      if (key.endsWith(":dead-letter")) {
        mockState.deadLetters.push(String(value));
        return;
      }
      mockState.queue.push(value);
    },
  },
}));

vi.mock("@/lib/analytics/click-logger", () => ({
  persistRedirectClick: async (input: RedirectClickInput) => {
    if (mockState.persistThrows) throw new Error("database unavailable");
    mockState.persisted.push(input);
  },
}));

vi.mock("@/lib/links/click-count-cache", () => ({
  incrementRedirectClickCount: async (input: {
    currentClickCount?: number;
    linkId: string;
  }) => {
    mockState.increments.push(input);
    return (input.currentClickCount ?? 0) + 1;
  },
  isRedirectClickCountedEvent: (eventType: string) =>
    eventType === "DIRECT_REDIRECT" || eventType === "LINK_PAGE_CTA_CLICK",
}));

import {
  enqueueRedirectClick,
  processRedirectClickQueue,
  recordRedirectClick,
  REDIRECT_CLICK_QUEUE_KEY,
} from "@/lib/analytics/click-queue";

describe("click queue", () => {
  beforeEach(() => {
    mockState.deadLetters = [];
    mockState.increments = [];
    mockState.ltrimCalls = [];
    mockState.queue = [];
    mockState.rpushThrows = false;
    mockState.persisted = [];
    mockState.persistThrows = false;
  });

  it("should enqueue redirect clicks to Redis", async () => {
    await enqueueRedirectClick(sampleInput);

    expect(mockState.queue).toHaveLength(1);
    expect(JSON.parse(String(mockState.queue[0] ?? "{}"))).toMatchObject({
      input: sampleInput,
      version: 1,
    });
    expect(mockState.ltrimCalls).toEqual([
      {
        end: -1,
        key: REDIRECT_CLICK_QUEUE_KEY,
        start: -10_000,
      },
    ]);
  });

  it("should fall back to direct persistence when Redis enqueue fails", async () => {
    mockState.rpushThrows = true;

    await expect(recordRedirectClick(sampleInput)).resolves.toEqual({
      status: "persisted",
    });

    expect(mockState.persisted).toEqual([sampleInput]);
    expect(mockState.increments).toEqual([{ linkId: "link-1" }]);
  });

  it("should increment counted click events after enqueue succeeds", async () => {
    await expect(
      recordRedirectClick(sampleInput, { currentClickCount: 12 }),
    ).resolves.toEqual({
      status: "queued",
    });

    expect(mockState.increments).toEqual([
      { currentClickCount: 12, linkId: "link-1" },
    ]);
  });

  it("should not increment Link Page view events", async () => {
    await expect(
      recordRedirectClick({
        ...sampleInput,
        eventType: "LINK_PAGE_VIEW",
      }),
    ).resolves.toEqual({ status: "queued" });

    expect(mockState.increments).toEqual([]);
  });

  it("should process queued click events into persistence", async () => {
    await enqueueRedirectClick(sampleInput);

    await expect(processRedirectClickQueue({ limit: 5 })).resolves.toEqual({
      deadLettered: 0,
      processed: 1,
    });

    expect(mockState.persisted).toEqual([sampleInput]);
    expect(mockState.queue).toEqual([]);
  });

  it("should process object payloads returned by Redis clients", async () => {
    mockState.queue.push({
      enqueuedAt: new Date().toISOString(),
      input: sampleInput,
      version: 1,
    });

    await expect(processRedirectClickQueue({ limit: 5 })).resolves.toEqual({
      deadLettered: 0,
      processed: 1,
    });

    expect(mockState.persisted).toEqual([sampleInput]);
    expect(mockState.queue).toEqual([]);
  });

  it("should dead-letter invalid queued payloads", async () => {
    mockState.queue.push("{");

    await expect(processRedirectClickQueue({ limit: 5 })).resolves.toEqual({
      deadLettered: 1,
      processed: 0,
    });

    expect(mockState.deadLetters).toEqual(["{"]);
  });
});
