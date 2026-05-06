import { z } from "zod";
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

export const deleteSmartRuleQuerySchema = z
  .object({
    ruleId: z.string().uuid("Rule ID must be a valid UUID"),
  })
  .strict();

export type DeleteSmartRuleQuery = z.infer<typeof deleteSmartRuleQuerySchema>;
export type SmartRuleInput = z.infer<typeof smartRuleSchema>;
export type UpsertSmartRulesInput = z.infer<typeof upsertSmartRulesSchema>;
