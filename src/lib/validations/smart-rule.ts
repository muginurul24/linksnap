import { z } from "zod";
import { getCountryByCode } from "@/lib/countries";
import { isSafeDestinationUrl } from "@/lib/validations/link";

const MAX_URL_LENGTH = 2048;
const MAX_CONDITION_DEPTH = 4;
const MAX_CONDITION_KEYS = 20;

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().trim().max(500, "Condition text is too long"),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema).max(20, "Condition arrays are too large"),
    z.record(z.string().trim().min(1).max(60), jsonValueSchema),
  ]),
);

function getDepth(value: JsonValue, depth = 0): number {
  if (value === null || typeof value !== "object") return depth;
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (maxDepth, item) => Math.max(maxDepth, getDepth(item, depth + 1)),
      depth + 1,
    );
  }

  return Object.values(value).reduce<number>(
    (maxDepth, item) => Math.max(maxDepth, getDepth(item, depth + 1)),
    depth + 1,
  );
}

const conditionSchema = z
  .record(z.string().trim().min(1).max(60), jsonValueSchema)
  .refine((value) => Object.keys(value).length > 0, "Condition is required")
  .refine(
    (value) => Object.keys(value).length <= MAX_CONDITION_KEYS,
    "Condition has too many fields",
  )
  .refine(
    (value) => getDepth(value) <= MAX_CONDITION_DEPTH,
    "Condition is too deeply nested",
  );

const destinationUrlSchema = z
  .string()
  .trim()
  .min(1, "Destination URL is required")
  .max(MAX_URL_LENGTH, "Destination URL is too long")
  .url("Enter a valid URL")
  .refine(isSafeDestinationUrl, "Destination URL is not allowed")
  .transform((value) => new URL(value).toString());

const optionalDestinationUrlSchema = z.preprocess((value) => {
  if (typeof value === "string" && !value.trim()) return undefined;

  return value;
}, destinationUrlSchema.optional());

export const smartRuleSchema = z
  .object({
    condition: conditionSchema,
    destinationUrl: destinationUrlSchema,
    priority: z.coerce.number().int().min(0).max(10_000).default(0),
    type: z.enum(["GEO", "DEVICE", "TIME", "LANGUAGE"]),
  })
  .strict();

export const upsertSmartRulesSchema = z
  .object({
    rules: z.array(smartRuleSchema).max(100, "Too many rules in one request"),
  })
  .strict();

const smartRuleV2ConditionValueSchema = z.union([
  z.string().trim().min(1, "Condition value is required").max(500),
  z
    .array(z.string().trim().min(1, "Condition value is required").max(500))
    .min(1, "Condition value is required")
    .max(20, "Too many condition values"),
]);

export const smartRuleV2ConditionSchema = z
  .object({
    operator: z.enum(["is", "is_not"]),
    type: z.enum(["country", "device", "bot", "time"]),
    value: smartRuleV2ConditionValueSchema,
  })
  .strict()
  .superRefine((condition, ctx) => {
    const values = Array.isArray(condition.value)
      ? condition.value
      : [condition.value];

    if (
      condition.type === "country" &&
      (values.length !== 1 || !getCountryByCode(values[0]))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Country must be a valid ISO 3166-1 alpha-2 code",
        path: ["value"],
      });
    }

    if (
      condition.type === "device" &&
      (values.length !== 1 || !["mobile", "desktop", "tablet"].includes(values[0]))
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Device must be mobile, desktop, or tablet",
        path: ["value"],
      });
    }

    if (condition.type === "time") {
      const [start, end] = values;
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;
      const invalidRange =
        values.length !== 2 ||
        !startDate ||
        !endDate ||
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        startDate > endDate;

      if (invalidRange) {
        ctx.addIssue({
          code: "custom",
          message: "Time condition must include a valid start and end date",
          path: ["value"],
        });
      }
    }
  });

export const smartRuleV2Schema = z
  .object({
    conditions: z
      .array(smartRuleV2ConditionSchema)
      .min(1, "At least one condition is required")
      .max(10, "Too many conditions"),
    destinationUrl: destinationUrlSchema,
    isActive: z.boolean(),
  })
  .strict();

export const upsertSmartRulesV2Schema = z
  .object({
    fallbackDestinationUrl: optionalDestinationUrlSchema,
    rules: z.array(smartRuleV2Schema).max(100, "Too many rules in one request"),
  })
  .strict();

function getRuleTypeFromV2(rule: SmartRuleV2Input): SmartRuleInput["type"] {
  const firstConditionType = rule.conditions[0]?.type;
  if (firstConditionType === "country") return "GEO";
  if (firstConditionType === "time") return "TIME";

  return "DEVICE";
}

function createV2ConditionPayload({
  fallbackDestinationUrl,
  rule,
}: {
  fallbackDestinationUrl?: string;
  rule: SmartRuleV2Input;
}): Record<string, JsonValue> {
  const payload: Record<string, JsonValue> = {
    conditions: rule.conditions as JsonValue,
    isActive: rule.isActive,
    version: 2,
  };

  if (fallbackDestinationUrl) payload.fallbackDestinationUrl = fallbackDestinationUrl;

  return payload;
}

function createFallbackOnlyV2Payload(
  fallbackDestinationUrl: string,
): Record<string, JsonValue> {
  return {
    conditions: [],
    fallbackDestinationUrl,
    fallbackOnly: true,
    isActive: false,
    version: 2,
  };
}

export function toPersistedSmartRulesV2(
  input: UpsertSmartRulesV2Input,
): SmartRuleInput[] {
  const fallbackDestinationUrl = input.fallbackDestinationUrl;
  const rules = input.rules.map<SmartRuleInput>((rule, index) => ({
    condition: createV2ConditionPayload({
      fallbackDestinationUrl: index === 0 ? fallbackDestinationUrl : undefined,
      rule,
    }),
    destinationUrl: rule.destinationUrl,
    priority: index,
    type: getRuleTypeFromV2(rule),
  }));

  if (rules.length > 0 || !fallbackDestinationUrl) return rules;

  return [
    {
      condition: createFallbackOnlyV2Payload(fallbackDestinationUrl),
      destinationUrl: fallbackDestinationUrl,
      priority: 0,
      type: "DEVICE",
    },
  ];
}

export const deleteSmartRuleQuerySchema = z
  .object({
    ruleId: z.string().uuid("Rule ID must be a valid UUID"),
  })
  .strict();

export type DeleteSmartRuleQuery = z.infer<typeof deleteSmartRuleQuerySchema>;
export type SmartRuleInput = z.infer<typeof smartRuleSchema>;
export type SmartRuleV2ConditionInput = z.infer<typeof smartRuleV2ConditionSchema>;
export type SmartRuleV2Input = z.infer<typeof smartRuleV2Schema>;
export type UpsertSmartRulesInput = z.infer<typeof upsertSmartRulesSchema>;
export type UpsertSmartRulesV2Input = z.infer<typeof upsertSmartRulesV2Schema>;
