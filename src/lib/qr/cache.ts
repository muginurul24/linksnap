import type { LinkSlugParams } from "@/lib/validations/link";
import type { QrCodeQuery } from "@/lib/validations/qr";

export function getQrCodeCacheKey({
  format,
  size,
  slug,
}: LinkSlugParams & QrCodeQuery): string {
  return `qr:${slug}:${format}:${size}`;
}
