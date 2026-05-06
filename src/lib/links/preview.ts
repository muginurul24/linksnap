const DEFAULT_SHORT_URL_BASE = "https://linksnap.id";

export function normalizeShortUrlBase(baseUrl?: string | null): string {
  const trimmed = baseUrl?.trim().replace(/\/+$/, "");
  return trimmed || DEFAULT_SHORT_URL_BASE;
}

export function buildShortUrlPreview(
  baseUrl: string | null | undefined,
  slug: string,
): string {
  const cleanedSlug = slug.trim().replace(/^\/+/, "") || "your-slug";
  return `${normalizeShortUrlBase(baseUrl)}/${cleanedSlug}`;
}
