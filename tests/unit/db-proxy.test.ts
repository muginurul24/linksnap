import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";

describe("db proxy", () => {
  it("should coerce to a stable description without opening a connection", () => {
    expect(String(db)).toBe("[object LinkSnapDbProxy]");
    expect(`${db}`).toBe("[object LinkSnapDbProxy]");
    expect(db.toString()).toBe("[object LinkSnapDbProxy]");
  });

  it("should expose an empty iterator for tool inspection", () => {
    expect([...(db as unknown as Iterable<unknown>)]).toEqual([]);
  });
});
