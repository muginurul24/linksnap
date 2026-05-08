import { z } from "@/lib/validations/zod";

const MAX_URL_LENGTH = 2048;
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function emptyStringToDate(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? value : date;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const optionalImageUrlSchema = z.preprocess(
  emptyStringToNull,
  z
    .string()
    .trim()
    .max(MAX_URL_LENGTH, "Image URL is too long")
    .url("Enter a valid image URL")
    .refine(isHttpUrl, "Image URL must use HTTP or HTTPS")
    .nullable()
    .optional(),
);

export const upsertLinkPageSchema = z
  .object({
    brandName: z.string().trim().min(1, "Brand name is required").max(100),
    countdownTarget: z.preprocess(
      emptyStringToDate,
      z.date().nullable().optional(),
    ),
    ctaColor: z
      .preprocess(emptyStringToUndefined, z.string().trim().optional())
      .pipe(
        z
          .string()
          .regex(HEX_COLOR_PATTERN, "CTA color must be a valid hex color")
          .default("#6366f1"),
      ),
    ctaText: z
      .preprocess(emptyStringToUndefined, z.string().trim().optional())
      .pipe(z.string().min(1, "CTA text is required").max(50).default("Continue")),
    description: z.preprocess(
      emptyStringToNull,
      z.string().trim().max(1000, "Description is too long").nullable().optional(),
    ),
    ogImage: optionalImageUrlSchema,
    showCountdown: z.boolean().default(false),
    showQrCode: z.boolean().default(true),
    showSocialProof: z.boolean().default(true),
    theme: z.enum(["auto", "light", "dark"]).default("auto"),
    title: z.string().trim().min(1, "Title is required").max(255),
  })
  .strict()
  .refine(
    (data) => !data.showCountdown || data.countdownTarget instanceof Date,
    {
      message: "Countdown target is required when countdown is enabled",
      path: ["countdownTarget"],
    },
  );

export type UpsertLinkPageInput = z.infer<typeof upsertLinkPageSchema>;
