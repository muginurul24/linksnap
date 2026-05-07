import { getCountryByCode } from "@/lib/countries";
import { isSafeDestinationUrl } from "@/lib/validations/link";

export const RULE_CONDITION_TYPES = ["country", "device", "bot", "time"] as const;
export const RULE_CONDITION_OPERATORS = ["is", "is_not"] as const;
export const DEVICE_VALUES = ["mobile", "desktop", "tablet"] as const;
export const PREDEFINED_BOTS = [
  "Googlebot",
  "Bingbot",
  "FacebookExternalHit",
  "Twitterbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "AhrefsBot",
  "SemrushBot",
  "GPTBot",
  "Claude-Web",
  "CCBot",
] as const;

export type RuleConditionType = (typeof RULE_CONDITION_TYPES)[number];
export type RuleConditionOperator = (typeof RULE_CONDITION_OPERATORS)[number];
export type RuleConditionControlKind =
  | "bot-checkboxes"
  | "country-combobox"
  | "device-select"
  | "time-range";
export type RuleConditionValue = string | string[];

export type SmartRuleBuilderCondition = {
  id: string;
  operator: RuleConditionOperator;
  type: RuleConditionType;
  value: RuleConditionValue;
};

export type SmartRuleBuilderRule = {
  conditions: SmartRuleBuilderCondition[];
  destinationUrl: string;
  id: string;
  isActive: boolean;
};

export type RuleBuilderValue = {
  fallbackDestinationUrl: string;
  rules: SmartRuleBuilderRule[];
};

export type RuleBuilderValidationResult =
  | { errors: string[]; success: false }
  | { success: true };

function createBuilderId(prefix: string): string {
  if (typeof globalThis.crypto.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

function getDefaultConditionValue(type: RuleConditionType): RuleConditionValue {
  if (type === "country") return "ID";
  if (type === "device") return "mobile";
  if (type === "bot") return ["Googlebot"];

  return ["", ""];
}

export function createRuleBuilderCondition(
  type: RuleConditionType = "country",
): SmartRuleBuilderCondition {
  return {
    id: createBuilderId("condition"),
    operator: "is",
    type,
    value: getDefaultConditionValue(type),
  };
}

export function createRuleBuilderRule(): SmartRuleBuilderRule {
  return {
    conditions: [createRuleBuilderCondition()],
    destinationUrl: "",
    id: createBuilderId("rule"),
    isActive: true,
  };
}

export function createRuleBuilderValue(): RuleBuilderValue {
  return {
    fallbackDestinationUrl: "",
    rules: [createRuleBuilderRule()],
  };
}

export function getConditionControlKind(
  type: RuleConditionType,
): RuleConditionControlKind {
  if (type === "country") return "country-combobox";
  if (type === "device") return "device-select";
  if (type === "bot") return "bot-checkboxes";

  return "time-range";
}

export function updateConditionType(
  condition: SmartRuleBuilderCondition,
  type: RuleConditionType,
): SmartRuleBuilderCondition {
  if (condition.type === type) return condition;

  return {
    ...condition,
    type,
    value: getDefaultConditionValue(type),
  };
}

export function addConditionToRule(
  rule: SmartRuleBuilderRule,
  type: RuleConditionType = "country",
): SmartRuleBuilderRule {
  return {
    ...rule,
    conditions: [...rule.conditions, createRuleBuilderCondition(type)],
  };
}

export function removeConditionFromRule(
  rule: SmartRuleBuilderRule,
  conditionId: string,
): SmartRuleBuilderRule {
  const nextConditions = rule.conditions.filter(
    (condition) => condition.id !== conditionId,
  );

  return {
    ...rule,
    conditions: nextConditions.length > 0 ? nextConditions : rule.conditions,
  };
}

export function addRuleToBuilder(value: RuleBuilderValue): RuleBuilderValue {
  return {
    ...value,
    rules: [...value.rules, createRuleBuilderRule()],
  };
}

export function removeRuleFromBuilder(
  value: RuleBuilderValue,
  ruleId: string,
): RuleBuilderValue {
  const rules = value.rules.filter((rule) => rule.id !== ruleId);

  return {
    ...value,
    rules: rules.length > 0 ? rules : value.rules,
  };
}

export function moveRule(
  rules: readonly SmartRuleBuilderRule[],
  ruleId: string,
  direction: "down" | "up",
): SmartRuleBuilderRule[] {
  const index = rules.findIndex((rule) => rule.id === ruleId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= rules.length) {
    return [...rules];
  }

  const nextRules = [...rules];
  [nextRules[index], nextRules[targetIndex]] = [
    nextRules[targetIndex],
    nextRules[index],
  ];

  return nextRules;
}

function asStringArray(value: RuleConditionValue): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

export function getTimeRangeValue(
  condition: SmartRuleBuilderCondition,
): [string, string] {
  const values = asStringArray(condition.value);
  return [values[0] ?? "", values[1] ?? ""];
}

export function setTimeRangeValue(
  condition: SmartRuleBuilderCondition,
  field: "end" | "start",
  value: string,
): SmartRuleBuilderCondition {
  const [start, end] = getTimeRangeValue(condition);
  return {
    ...condition,
    value: field === "start" ? [value, end] : [start, value],
  };
}

export function getBotConditionValues(
  condition: SmartRuleBuilderCondition,
): string[] {
  return asStringArray(condition.value);
}

export function setBotPatternSelection(
  condition: SmartRuleBuilderCondition,
  pattern: string,
  checked: boolean,
): SmartRuleBuilderCondition {
  const values = new Set(getBotConditionValues(condition));
  if (checked) values.add(pattern);
  if (!checked) values.delete(pattern);

  return { ...condition, value: Array.from(values) };
}

export function setBotCustomPatterns(
  condition: SmartRuleBuilderCondition,
  rawValue: string,
): SmartRuleBuilderCondition {
  const selectedPredefined = getBotConditionValues(condition).filter((value) =>
    PREDEFINED_BOTS.includes(value as (typeof PREDEFINED_BOTS)[number]),
  );
  const custom = rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return { ...condition, value: [...selectedPredefined, ...custom] };
}

export function getBotCustomPatternText(
  condition: SmartRuleBuilderCondition,
): string {
  return getBotConditionValues(condition)
    .filter(
      (value) => !PREDEFINED_BOTS.includes(value as (typeof PREDEFINED_BOTS)[number]),
    )
    .join(", ");
}

function getConditionValueLabel(condition: SmartRuleBuilderCondition): string {
  if (condition.type === "country") {
    const country = getCountryByCode(asStringArray(condition.value)[0]);
    return country ? country.name : "country";
  }

  if (condition.type === "time") {
    const [start, end] = getTimeRangeValue(condition);
    return start && end ? `${start} to ${end}` : "date range";
  }

  const value = asStringArray(condition.value);
  return value.length > 0 ? value.join(", ") : condition.type;
}

export function getReadableRuleSummary(rule: SmartRuleBuilderRule): string {
  const conditions = rule.conditions
    .map((condition) => {
      const operatorLabel = condition.operator === "is" ? "is" : "is not";
      return `${condition.type} ${operatorLabel} ${getConditionValueLabel(condition)}`;
    })
    .join(" AND ");
  const destination = rule.destinationUrl.trim() || "destination";

  return `IF ${conditions || "condition"} -> ${destination}`;
}

function isValidDestinationUrl(value: string): boolean {
  const trimmed = value.trim();
  return Boolean(trimmed) && isSafeDestinationUrl(trimmed);
}

function isValidCondition(condition: SmartRuleBuilderCondition): boolean {
  if (condition.type === "country") {
    return getCountryByCode(asStringArray(condition.value)[0]) !== null;
  }

  if (condition.type === "device") {
    return DEVICE_VALUES.includes(asStringArray(condition.value)[0] as never);
  }

  if (condition.type === "bot") return asStringArray(condition.value).length > 0;

  const [start, end] = getTimeRangeValue(condition);
  return Boolean(start && end && new Date(start) <= new Date(end));
}

export function validateRuleBuilderValue(
  value: RuleBuilderValue,
): RuleBuilderValidationResult {
  const errors: string[] = [];

  value.rules.forEach((rule, index) => {
    if (!rule.destinationUrl.trim()) errors.push(`Rule ${index + 1} needs a URL.`);
    if (rule.destinationUrl.trim() && !isValidDestinationUrl(rule.destinationUrl)) {
      errors.push(`Rule ${index + 1} URL is not allowed.`);
    }
    if (rule.conditions.some((condition) => !isValidCondition(condition))) {
      errors.push(`Rule ${index + 1} has an invalid condition.`);
    }
  });

  if (
    value.fallbackDestinationUrl.trim() &&
    !isValidDestinationUrl(value.fallbackDestinationUrl)
  ) {
    errors.push("Fallback URL is not allowed.");
  }

  return errors.length > 0 ? { errors, success: false } : { success: true };
}
