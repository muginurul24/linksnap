import type { LinkSlugParams } from "@/lib/validations/link";
import type { QrCodeQuery } from "@/lib/validations/qr";

export const QR_RENDER_CACHE_TTL_SECONDS = 60 * 60 * 24;

export function getQrCodeCacheKey({
  format,
  size,
  slug,
}: LinkSlugParams & QrCodeQuery): string {
  return `qr:${slug}:${format}:${size}`;
}
