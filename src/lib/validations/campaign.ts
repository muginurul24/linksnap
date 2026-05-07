import { z } from "zod";

const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9-]{3,100}$/;

function emptyStringToNull(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

const campaignSlugSchema = z
  .string()
  .trim()
  .regex(
    CAMPAIGN_SLUG_PATTERN,
    "Slug must be 3-100 lowercase letters, numbers, or hyphens",
  );

const optionalTextSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(500, "Description is too long").nullable().optional(),
);

const utmValueSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(100, "UTM value is too long").nullable().optional(),
);

export const campaignIdParamsSchema = z
  .object({
    id: z.string().uuid("Campaign ID must be a valid UUID"),
  })
  .strict();

export type CampaignIdParams = z.infer<typeof campaignIdParamsSchema>;

export const createCampaignSchema = z
  .object({
    description: optionalTextSchema,
    name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
    slug: campaignSlugSchema,
    utmCampaign: utmValueSchema,
    utmContent: utmValueSchema,
    utmMedium: utmValueSchema,
    utmSource: utmValueSchema,
    utmTerm: utmValueSchema,
  })
  .strict();

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z
  .object({
    description: optionalTextSchema,
    name: z
      .preprocess(
        emptyStringToUndefined,
        z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
      )
      .optional(),
    slug: z.preprocess(emptyStringToUndefined, campaignSlugSchema.optional()),
    utmCampaign: utmValueSchema,
    utmContent: utmValueSchema,
    utmMedium: utmValueSchema,
    utmSource: utmValueSchema,
    utmTerm: utmValueSchema,
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "At least one field must be provided",
  );

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const listCampaignsQuerySchema = z
  .object({
    limit: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(100).default(20),
    ),
    page: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).default(1),
    ),
    search: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(100, "Search is too long").optional(),
    ),
  })
  .strict();

export type ListCampaignsQuery = z.infer<typeof listCampaignsQuerySchema>;
