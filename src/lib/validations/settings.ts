import { z } from "zod";

function emptyStringToNull(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

export const settingsProfileSchema = z
  .object({
    name: z.preprocess(
      emptyStringToNull,
      z.string().max(255, "Name is too long").nullable(),
    ),
  })
  .strict();

export type SettingsProfileInput = z.infer<typeof settingsProfileSchema>;

export const notificationPreferencesSchema = z
  .object({
    linkPerformanceAlerts: z.boolean(),
    paymentConfirmations: z.boolean(),
    productUpdates: z.boolean(),
    weeklyAnalyticsReport: z.boolean(),
  })
  .strict();

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;
