import { z } from "@/lib/validations/zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

export const dashboardAnalyticsQuerySchema = z
  .object({
    from: z.preprocess(
      emptyStringToUndefined,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
    range: z.preprocess(
      emptyStringToUndefined,
      z.enum(["7", "30", "90", "custom"]).default("30"),
    ),
    to: z.preprocess(
      emptyStringToUndefined,
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ),
  })
  .strict();

export type DashboardAnalyticsQuery = z.infer<
  typeof dashboardAnalyticsQuerySchema
>;
