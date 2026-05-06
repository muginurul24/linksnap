import { describe, expect, it } from "vitest";
import {
  deleteSmartRuleQuerySchema,
  upsertSmartRulesSchema,
} from "../../src/lib/validations/smart-rule";

describe("Smart Rule validation", () => {
  it("should accept a valid batch of Smart Rules", () => {
    const parsed = upsertSmartRulesSchema.safeParse({
      rules: [
        {
          condition: { countries: ["ID", "MY"] },
          destinationUrl: "https://example.com/indonesia",
          priority: 10,
          type: "GEO",
        },
        {
          condition: { device: "mobile" },
          destinationUrl: "https://example.com/mobile",
          priority: 5,
          type: "DEVICE",
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("should reject unsafe destination URLs", () => {
    const parsed = upsertSmartRulesSchema.safeParse({
      rules: [
        {
          condition: { device: "mobile" },
          destinationUrl: "http://localhost:3000/internal",
          priority: 1,
          type: "DEVICE",
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("should reject empty or deeply nested conditions", () => {
    expect(
      upsertSmartRulesSchema.safeParse({
        rules: [
          {
            condition: {},
            destinationUrl: "https://example.com",
            type: "GEO",
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      upsertSmartRulesSchema.safeParse({
        rules: [
          {
            condition: { a: { b: { c: { d: { e: "too-deep" } } } } },
            destinationUrl: "https://example.com",
            type: "TIME",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("should validate delete query rule IDs", () => {
    expect(
      deleteSmartRuleQuerySchema.safeParse({
        ruleId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      }).success,
    ).toBe(true);
    expect(deleteSmartRuleQuerySchema.safeParse({ ruleId: "bad" }).success).toBe(
      false,
    );
  });
});
