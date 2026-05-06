import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9-]{3,50}$/;
const MAX_URL_LENGTH = 2048;

function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

function emptyStringToNull(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? null : value;
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  if (first === undefined || second === undefined) return false;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19))
  );
}

function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::" || normalized === "::1") return true;

  if (normalized.startsWith("::ffff:")) return true;

  const firstGroup = normalized.split(":")[0];
  if (!firstGroup) return false;

  const first = Number.parseInt(firstGroup, 16);
  if (!Number.isInteger(first)) return false;

  return (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80;
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    isPrivateIpv4(normalized) ||
    isPrivateIpv6(normalized)
  );
}

export function isSafeDestinationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;

    return !isBlockedHostname(url.hostname);
  } catch {
    return false;
  }
}

const destinationUrlSchema = z
  .string()
  .trim()
  .min(1, "Destination URL is required")
  .max(MAX_URL_LENGTH, "Destination URL is too long")
  .url("Enter a valid URL")
  .refine(isSafeDestinationUrl, "Destination URL is not allowed")
  .transform((value) => new URL(value).toString());

const slugSchema = z
  .string()
  .trim()
  .regex(SLUG_PATTERN, "Slug must be 3-50 lowercase letters, numbers, or hyphens");

export const linkIdParamsSchema = z
  .object({
    id: z.string().uuid("Link ID must be a valid UUID"),
  })
  .strict();

export type LinkIdParams = z.infer<typeof linkIdParamsSchema>;

export const linkSlugParamsSchema = z
  .object({
    slug: slugSchema,
  })
  .strict();

export type LinkSlugParams = z.infer<typeof linkSlugParamsSchema>;

export const createLinkSchema = z
  .object({
    destinationUrl: destinationUrlSchema,
    slug: z.preprocess(emptyStringToUndefined, slugSchema.optional()),
    title: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().max(255, "Title is too long").optional(),
    ),
  })
  .strict();

export type CreateLinkInput = z.infer<typeof createLinkSchema>;

export const updateLinkSchema = z
  .object({
    destinationUrl: z.preprocess(
      emptyStringToUndefined,
      destinationUrlSchema.optional(),
    ),
    slug: z.preprocess(emptyStringToUndefined, slugSchema.optional()),
    title: z.preprocess(
      emptyStringToNull,
      z.string().trim().max(255, "Title is too long").nullable().optional(),
    ),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "At least one field must be provided",
  );

export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;

export const listLinksQuerySchema = z
  .object({
    campaignId: z.preprocess(
      emptyStringToUndefined,
      z.string().uuid("Campaign ID must be a valid UUID").optional(),
    ),
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

export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;

function emptyStringToDate(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? value : date;
}

export const linkAnalyticsQuerySchema = z
  .object({
    from: z.preprocess(emptyStringToDate, z.date().optional()),
    to: z.preprocess(emptyStringToDate, z.date().optional()),
  })
  .strict();

export type LinkAnalyticsQuery = z.infer<typeof linkAnalyticsQuerySchema>;
