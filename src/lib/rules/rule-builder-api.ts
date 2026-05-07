import {
  createRuleBuilderRule,
  createRuleBuilderValue,
  DEVICE_VALUES,
  RULE_CONDITION_OPERATORS,
  RULE_CONDITION_TYPES,
  type RuleBuilderValue,
  type RuleConditionOperator,
  type RuleConditionType,
  type RuleConditionValue,
  type SmartRuleBuilderCondition,
  type SmartRuleBuilderRule,
} from "@/lib/rules/rule-builder";
import type {
  SmartRuleV2ConditionInput,
  UpsertSmartRulesV2Input,
} from "@/lib/validations/smart-rule";

export type StoredSmartRuleForBuilder = {
  condition: unknown;
  destinationUrl: string;
  id: string;
  priority: number;
  type: "DEVICE" | "GEO" | "LANGUAGE" | "TIME";
};

type StoredV2Payload = {
  conditions: SmartRuleV2ConditionInput[];
  fallbackDestinationUrl: string | null;
  fallbackOnly: boolean;
  isActive: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isConditionType(value: unknown): value is RuleConditionType {
  return RULE_CONDITION_TYPES.includes(value as RuleConditionType);
}

function isConditionOperator(value: unknown): value is RuleConditionOperator {
  return RULE_CONDITION_OPERATORS.includes(value as RuleConditionOperator);
}

function isConditionValue(value: unknown): value is RuleConditionValue {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function parseV2Condition(value: unknown): SmartRuleV2ConditionInput | null {
  const condition = asRecord(value);
  if (!condition) return null;
  if (!isConditionType(condition.type)) return null;
  if (!isConditionOperator(condition.operator)) return null;
  if (!isConditionValue(condition.value)) return null;

  return {
    operator: condition.operator,
    type: condition.type,
    value: condition.value,
  };
}

function getV2Payload(rule: StoredSmartRuleForBuilder): StoredV2Payload | null {
  const condition = asRecord(rule.condition);
  if (!condition || !Array.isArray(condition.conditions)) return null;

  return {
    conditions: condition.conditions
      .map(parseV2Condition)
      .filter((item): item is SmartRuleV2ConditionInput => item !== null),
    fallbackDestinationUrl:
      typeof condition.fallbackDestinationUrl === "string"
        ? condition.fallbackDestinationUrl
        : null,
    fallbackOnly: condition.fallbackOnly === true,
    isActive:
      typeof condition.isActive === "boolean" ? condition.isActive : true,
  };
}

function createBuilderCondition({
  id,
  operator,
  type,
  value,
}: {
  id: string;
  operator: RuleConditionOperator;
  type: RuleConditionType;
  value: RuleConditionValue;
}): SmartRuleBuilderCondition {
  return { id, operator, type, value };
}

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const firstValue = value.find(
      (item): item is string => typeof item === "string" && Boolean(item.trim()),
    );

    return firstValue?.trim() ?? null;
  }

  return null;
}

function legacyConditionValue(
  condition: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = firstString(condition[key]);
    if (value) return value;
  }

  return null;
}

function createLegacyBuilderCondition(
  rule: StoredSmartRuleForBuilder,
): SmartRuleBuilderCondition {
  const condition = asRecord(rule.condition) ?? {};

  if (rule.type === "GEO") {
    return createBuilderCondition({
      id: `${rule.id}-condition-0`,
      operator: "is",
      type: "country",
      value: legacyConditionValue(condition, ["country", "countries", "value"]) ?? "ID",
    });
  }

  if (rule.type === "TIME") {
    return createBuilderCondition({
      id: `${rule.id}-condition-0`,
      operator: "is",
      type: "time",
      value: [
        legacyConditionValue(condition, ["from", "start", "startDate"]) ?? "",
        legacyConditionValue(condition, ["to", "end", "endDate"]) ?? "",
      ],
    });
  }

  const device = legacyConditionValue(condition, ["device", "devices", "value"]);
  return createBuilderCondition({
    id: `${rule.id}-condition-0`,
    operator: "is",
    type: "device",
    value: DEVICE_VALUES.includes(device as (typeof DEVICE_VALUES)[number])
      ? device ?? "mobile"
      : "mobile",
  });
}

function createBuilderRuleFromV2(
  rule: StoredSmartRuleForBuilder,
  payload: StoredV2Payload,
): SmartRuleBuilderRule {
  return {
    conditions: payload.conditions.map((condition, index) =>
      createBuilderCondition({
        id: `${rule.id}-condition-${index}`,
        operator: condition.operator,
        type: condition.type,
        value: condition.value,
      }),
    ),
    destinationUrl: rule.destinationUrl,
    id: rule.id,
    isActive: payload.isActive,
  };
}

function createBuilderRuleFromLegacy(
  rule: StoredSmartRuleForBuilder,
): SmartRuleBuilderRule {
  return {
    conditions: [createLegacyBuilderCondition(rule)],
    destinationUrl: rule.destinationUrl,
    id: rule.id,
    isActive: true,
  };
}

export function storedRulesToRuleBuilderValue(
  rules: readonly StoredSmartRuleForBuilder[],
): RuleBuilderValue {
  if (rules.length === 0) return createRuleBuilderValue();

  const sortedRules = [...rules].sort(
    (first, second) => first.priority - second.priority,
  );
  const v2Rules: SmartRuleBuilderRule[] = [];
  const legacyRules: SmartRuleBuilderRule[] = [];
  let fallbackDestinationUrl = "";
  let hasV2Payload = false;

  for (const rule of sortedRules) {
    const payload = getV2Payload(rule);
    if (!payload) {
      legacyRules.push(createBuilderRuleFromLegacy(rule));
      continue;
    }

    hasV2Payload = true;
    fallbackDestinationUrl ||= payload.fallbackDestinationUrl ?? "";
    if (payload.fallbackOnly) continue;

    v2Rules.push(createBuilderRuleFromV2(rule, payload));
  }

  if (hasV2Payload) {
    return {
      fallbackDestinationUrl,
      rules: v2Rules.length > 0 ? v2Rules : [createRuleBuilderRule()],
    };
  }

  return {
    fallbackDestinationUrl: "",
    rules: legacyRules.length > 0 ? legacyRules : [createRuleBuilderRule()],
  };
}

export function ruleBuilderValueToSmartRulesV2Input(
  value: RuleBuilderValue,
): UpsertSmartRulesV2Input {
  return {
    ...(value.fallbackDestinationUrl.trim()
      ? { fallbackDestinationUrl: value.fallbackDestinationUrl.trim() }
      : {}),
    rules: value.rules.map((rule) => ({
      conditions: rule.conditions.map((condition) => ({
        operator: condition.operator,
        type: condition.type,
        value: condition.value,
      })),
      destinationUrl: rule.destinationUrl.trim(),
      isActive: rule.isActive,
    })),
  };
}
