import { describe, expect, it } from "vitest";
import {
  addConditionToRule,
  addRuleToBuilder,
  createRuleBuilderCondition,
  createRuleBuilderRule,
  createRuleBuilderValue,
  getConditionControlKind,
  getReadableRuleSummary,
  moveRule,
  removeConditionFromRule,
  removeRuleFromBuilder,
  setBotCustomPatterns,
  setBotPatternSelection,
  setTimeRangeValue,
  updateConditionType,
  validateRuleBuilderValue,
  type SmartRuleBuilderRule,
} from "../../src/lib/rules/rule-builder";

function namedRule(id: string): SmartRuleBuilderRule {
  return {
    conditions: [createRuleBuilderCondition("device")],
    destinationUrl: `https://example.com/${id}`,
    id,
    isActive: true,
  };
}

describe("rule builder helpers", () => {
  it("should create a default active rule with a country condition", () => {
    const value = createRuleBuilderValue();

    expect(value.rules).toHaveLength(1);
    expect(value.rules[0].isActive).toBe(true);
    expect(value.rules[0].conditions[0]).toMatchObject({
      operator: "is",
      type: "country",
      value: "ID",
    });
  });

  it("should add, remove, and reorder rules", () => {
    const initial = { fallbackDestinationUrl: "", rules: [namedRule("a")] };
    const added = addRuleToBuilder(initial);
    const reordered = moveRule([namedRule("a"), namedRule("b")], "a", "down");
    const removed = removeRuleFromBuilder(
      { fallbackDestinationUrl: "", rules: [namedRule("a"), namedRule("b")] },
      "a",
    );

    expect(added.rules).toHaveLength(2);
    expect(reordered.map((rule) => rule.id)).toEqual(["b", "a"]);
    expect(removed.rules.map((rule) => rule.id)).toEqual(["b"]);
  });

  it("should keep at least one rule and condition when removing items", () => {
    const rule = addConditionToRule(createRuleBuilderRule(), "device");
    const oneRule = { fallbackDestinationUrl: "", rules: [rule] };
    const reducedRule = removeConditionFromRule(rule, rule.conditions[0].id);

    expect(removeRuleFromBuilder(oneRule, rule.id).rules).toEqual([rule]);
    expect(reducedRule.conditions).toHaveLength(1);
    expect(removeConditionFromRule(reducedRule, reducedRule.conditions[0].id).conditions).toEqual(
      reducedRule.conditions,
    );
  });

  it("should choose the correct control kind for each condition type", () => {
    expect(getConditionControlKind("country")).toBe("country-combobox");
    expect(getConditionControlKind("device")).toBe("device-select");
    expect(getConditionControlKind("bot")).toBe("bot-checkboxes");
    expect(getConditionControlKind("time")).toBe("time-range");
  });

  it("should reset condition value when condition type changes", () => {
    const deviceCondition = updateConditionType(
      createRuleBuilderCondition("country"),
      "device",
    );
    const timeCondition = updateConditionType(deviceCondition, "time");

    expect(deviceCondition).toMatchObject({ type: "device", value: "mobile" });
    expect(timeCondition).toMatchObject({ type: "time", value: ["", ""] });
  });

  it("should handle bot checkbox and custom pattern values", () => {
    const condition = createRuleBuilderCondition("bot");
    const unchecked = setBotPatternSelection(condition, "Googlebot", false);
    const custom = setBotCustomPatterns(unchecked, "CustomBot, AnotherBot");

    expect(unchecked.value).toEqual([]);
    expect(custom.value).toEqual(["CustomBot", "AnotherBot"]);
  });

  it("should summarize a country redirect rule", () => {
    const rule = {
      ...createRuleBuilderRule(),
      destinationUrl: "https://example.com/id",
    };

    expect(getReadableRuleSummary(rule)).toBe(
      "IF country is Indonesia -> https://example.com/id",
    );
  });

  it("should validate destination URLs and condition values", () => {
    const validRule = {
      ...createRuleBuilderRule(),
      destinationUrl: "https://example.com/id",
    };
    const invalidRule = {
      ...validRule,
      destinationUrl: "http://127.0.0.1/admin",
    };
    const timeRule = {
      ...validRule,
      conditions: [
        setTimeRangeValue(
          setTimeRangeValue(createRuleBuilderCondition("time"), "start", "2026-05-08"),
          "end",
          "2026-05-07",
        ),
      ],
    };

    expect(
      validateRuleBuilderValue({
        fallbackDestinationUrl: "",
        rules: [validRule],
      }),
    ).toEqual({ success: true });
    expect(
      validateRuleBuilderValue({
        fallbackDestinationUrl: "",
        rules: [invalidRule],
      }).success,
    ).toBe(false);
    expect(
      validateRuleBuilderValue({
        fallbackDestinationUrl: "",
        rules: [timeRule],
      }).success,
    ).toBe(false);
  });
});
