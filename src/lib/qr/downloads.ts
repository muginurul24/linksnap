export type QrDownloadFormat = "png" | "svg";

export function getQrDownloadHref(
  slug: string,
  format: QrDownloadFormat,
): string {
  return `/api/v1/qr/${encodeURIComponent(slug)}?format=${format}`;
}

export function getQrDownloadFilename(
  slug: string,
  format: QrDownloadFormat,
): string {
  return `${slug}.${format}`;
}
