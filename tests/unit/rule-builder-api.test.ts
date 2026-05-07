import { describe, expect, it } from "vitest";
import {
  ruleBuilderValueToSmartRulesV2Input,
  storedRulesToRuleBuilderValue,
  type StoredSmartRuleForBuilder,
} from "../../src/lib/rules/rule-builder-api";

function storedRule(
  overrides: Partial<StoredSmartRuleForBuilder> = {},
): StoredSmartRuleForBuilder {
  return {
    condition: {
      conditions: [{ operator: "is", type: "device", value: "mobile" }],
      fallbackDestinationUrl: "https://example.com/default/",
      isActive: true,
      version: 2,
    },
    destinationUrl: "https://example.com/mobile/",
    id: "rule-one",
    priority: 0,
    type: "DEVICE",
    ...overrides,
  };
}

describe("Rule Builder API mapping", () => {
  it("should convert stored V2 rules into visual builder state", () => {
    const value = storedRulesToRuleBuilderValue([
      storedRule({
        condition: {
          conditions: [{ operator: "is", type: "bot", value: ["GPTBot"] }],
          isActive: false,
          version: 2,
        },
        destinationUrl: "https://example.com/bot/",
        id: "rule-two",
        priority: 1,
      }),
      storedRule(),
    ]);

    expect(value).toMatchObject({
      fallbackDestinationUrl: "https://example.com/default/",
      rules: [
        {
          conditions: [{ operator: "is", type: "device", value: "mobile" }],
          destinationUrl: "https://example.com/mobile/",
          id: "rule-one",
          isActive: true,
        },
        {
          conditions: [{ operator: "is", type: "bot", value: ["GPTBot"] }],
          destinationUrl: "https://example.com/bot/",
          id: "rule-two",
          isActive: false,
        },
      ],
    });
  });

  it("should hide fallback-only sentinel rows from visual builder state", () => {
    const value = storedRulesToRuleBuilderValue([
      storedRule({
        condition: {
          conditions: [],
          fallbackDestinationUrl: "https://example.com/default/",
          fallbackOnly: true,
          isActive: false,
          version: 2,
        },
        destinationUrl: "https://example.com/default/",
      }),
    ]);

    expect(value.fallbackDestinationUrl).toBe("https://example.com/default/");
    expect(value.rules).toHaveLength(1);
    expect(value.rules[0]?.destinationUrl).toBe("");
  });

  it("should convert legacy rules into visual builder state", () => {
    const value = storedRulesToRuleBuilderValue([
      storedRule({
        condition: { countries: ["ID"] },
        destinationUrl: "https://example.com/id",
        id: "legacy-country",
        type: "GEO",
      }),
      storedRule({
        condition: { device: "desktop" },
        destinationUrl: "https://example.com/desktop",
        id: "legacy-device",
        priority: 1,
        type: "DEVICE",
      }),
    ]);

    expect(value.rules).toMatchObject([
      {
        conditions: [{ type: "country", value: "ID" }],
        destinationUrl: "https://example.com/id",
      },
      {
        conditions: [{ type: "device", value: "desktop" }],
        destinationUrl: "https://example.com/desktop",
      },
    ]);
  });

  it("should serialize builder state into V2 upsert input", () => {
    const input = ruleBuilderValueToSmartRulesV2Input({
      fallbackDestinationUrl: " https://example.com/default ",
      rules: [
        {
          conditions: [
            {
              id: "condition-one",
              operator: "is_not",
              type: "device",
              value: "desktop",
            },
          ],
          destinationUrl: "https://example.com/mobile",
          id: "rule-one",
          isActive: true,
        },
      ],
    });

    expect(input).toEqual({
      fallbackDestinationUrl: "https://example.com/default",
      rules: [
        {
          conditions: [{ operator: "is_not", type: "device", value: "desktop" }],
          destinationUrl: "https://example.com/mobile",
          isActive: true,
        },
      ],
    });
  });
});
