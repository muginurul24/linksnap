import { describe, expect, it } from "vitest";
import { selectSplitTestVariant } from "../../src/lib/split-tests/router";
import type { SplitTestVariantRecord } from "../../src/lib/db/queries/split-tests";

function createVariant(
  overrides: Partial<SplitTestVariantRecord> = {},
): SplitTestVariantRecord {
  return {
    clickCount: 0,
    destinationUrl: "https://example.com/a",
    id: "variant-a",
    weight: 50,
    ...overrides,
  };
}

describe("split test router", () => {
  it("should select variants by weight range when random value is provided", () => {
    const variants = [
      createVariant({ id: "variant-a", weight: 70 }),
      createVariant({
        destinationUrl: "https://example.com/b",
        id: "variant-b",
        weight: 30,
      }),
    ];

    expect(selectSplitTestVariant(variants, 0)?.id).toBe("variant-a");
    expect(selectSplitTestVariant(variants, 0.69)?.id).toBe("variant-a");
    expect(selectSplitTestVariant(variants, 0.7)?.id).toBe("variant-b");
    expect(selectSplitTestVariant(variants, 0.99)?.id).toBe("variant-b");
  });

  it("should ignore zero weight variants when selecting a destination", () => {
    const variants = [
      createVariant({ id: "variant-a", weight: 0 }),
      createVariant({
        destinationUrl: "https://example.com/b",
        id: "variant-b",
        weight: 100,
      }),
    ];

    expect(selectSplitTestVariant(variants, 0)?.id).toBe("variant-b");
    expect(selectSplitTestVariant([], 0)).toBeNull();
  });
});
