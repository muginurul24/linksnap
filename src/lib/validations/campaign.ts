import { z } from "zod";

const CAMPAIGN_SLUG_PATTERN = /^[a-z0-9-]{3,100}$/;
const MAX_PAGE_LIMIT = 100;

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

function emptyStringToDate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? value : date;
}

function emptyStringToCompareSlugs(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const slugs = value
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  return slugs.length > 0 ? [...new Set(slugs)] : undefined;
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
    cursor: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(512, "Cursor is too long").optional(),
    ),
    limit: z.preprocess(
      emptyStringToUndefined,
      z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(20),
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

export const campaignAnalyticsQuerySchema = z
  .object({
    compare: z.preprocess(
      emptyStringToCompareSlugs,
      z.array(campaignSlugSchema).max(5, "Too many comparison campaigns").optional(),
    ),
    from: z.preprocess(emptyStringToDate, z.date().optional()),
    to: z.preprocess(emptyStringToDate, z.date().optional()),
  })
  .strict();

export type CampaignAnalyticsQuery = z.infer<typeof campaignAnalyticsQuerySchema>;

export const addCampaignLinksSchema = z
  .object({
    linkIds: z
      .array(z.string().uuid("Link ID must be a valid UUID"))
      .min(1, "At least one link is required")
      .max(100, "Too many links in one request")
      .transform((value) => [...new Set(value)]),
    preview: z.boolean().default(false),
  })
  .strict();

export type AddCampaignLinksInput = z.infer<typeof addCampaignLinksSchema>;

export const removeCampaignLinkSchema = z
  .object({
    linkId: z.string().uuid("Link ID must be a valid UUID"),
  })
  .strict();

export type RemoveCampaignLinkInput = z.infer<typeof removeCampaignLinkSchema>;
