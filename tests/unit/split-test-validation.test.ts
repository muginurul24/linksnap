import { describe, expect, it } from "vitest";
import { upsertSplitTestSchema } from "../../src/lib/validations/split-test";

describe("split test validation", () => {
  it("should accept valid split test variants when destinations are safe", () => {
    const parsed = upsertSplitTestSchema.safeParse({
      variants: [
        { destinationUrl: " https://example.com/a ", weight: 70 },
        { destinationUrl: "https://example.com/b", weight: 30 },
      ],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.variants).toEqual([
      { destinationUrl: "https://example.com/a", weight: 70 },
      { destinationUrl: "https://example.com/b", weight: 30 },
    ]);
  });

  it("should reject invalid split test variants when input is unsafe", () => {
    expect(
      upsertSplitTestSchema.safeParse({
        variants: [{ destinationUrl: "https://example.com/a", weight: 100 }],
      }).success,
    ).toBe(false);
    expect(
      upsertSplitTestSchema.safeParse({
        variants: [
          { destinationUrl: "https://example.com/a", weight: 0 },
          { destinationUrl: "http://127.0.0.1/admin", weight: 100 },
        ],
      }).success,
    ).toBe(false);
  });
});
