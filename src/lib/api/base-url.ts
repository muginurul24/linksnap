import type { NextRequest } from "next/server";

export function getBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");

  return request.nextUrl.origin;
}

export function buildShortUrl(request: NextRequest, slug: string): string {
  return `${getBaseUrl(request)}/${slug}`;
}
