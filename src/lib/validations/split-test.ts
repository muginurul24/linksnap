import { z } from "zod";
import { isSafeDestinationUrl } from "@/lib/validations/link";

const MAX_URL_LENGTH = 2048;

const splitTestDestinationUrlSchema = z
  .string()
  .trim()
  .min(1, "Destination URL is required")
  .max(MAX_URL_LENGTH, "Destination URL is too long")
  .url("Enter a valid URL")
  .refine(isSafeDestinationUrl, "Destination URL is not allowed")
  .transform((value) => new URL(value).toString());

export const upsertSplitTestSchema = z
  .object({
    variants: z
      .array(
        z
          .object({
            destinationUrl: splitTestDestinationUrlSchema,
            weight: z.coerce
              .number()
              .int("Weight must be a whole number")
              .min(1, "Weight must be at least 1")
              .max(100, "Weight cannot exceed 100"),
          })
          .strict(),
      )
      .min(2, "At least two variants are required")
      .max(10, "Too many variants"),
  })
  .strict();

export type UpsertSplitTestInput = z.infer<typeof upsertSplitTestSchema>;
