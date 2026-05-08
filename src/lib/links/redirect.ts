export type RedirectLinkMetadata = {
  destinationUrl: string;
  expiresAt: Date | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: Date | null;
  slug: string;
};

export type RedirectLink = RedirectLinkMetadata & {
  clickCount: number;
};

export type RedirectLinkCachePayload = {
  destinationUrl: string;
  expiresAt: string | null;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  scheduledAt: string | null;
  slug: string;
};

export const REDIRECT_CACHE_TTL_SECONDS = 300;
const PUBLIC_SLUG_PATTERN = /^[a-z0-9-]{3,50}$/;

export function getRedirectCacheKey(slug: string): string {
  return `redirect:${slug}`;
}

export function isPublicSlug(value: string): boolean {
  return PUBLIC_SLUG_PATTERN.test(value);
}

export function isRedirectLinkAvailable(
  link: Pick<RedirectLinkMetadata, "expiresAt" | "isActive" | "scheduledAt">,
  now = new Date(),
): boolean {
  if (!link.isActive) return false;
  if (link.scheduledAt && link.scheduledAt > now) return false;
  if (link.expiresAt && link.expiresAt <= now) return false;

  return true;
}

export function toRedirectLinkCachePayload(
  link: RedirectLinkMetadata,
): RedirectLinkCachePayload {
  return {
    destinationUrl: link.destinationUrl,
    expiresAt: link.expiresAt?.toISOString() ?? null,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    isActive: link.isActive,
    scheduledAt: link.scheduledAt?.toISOString() ?? null,
    slug: link.slug,
  };
}

export function fromRedirectLinkCachePayload(
  payload: RedirectLinkCachePayload,
): RedirectLinkMetadata {
  return {
    destinationUrl: payload.destinationUrl,
    expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
    hasLinkPage: payload.hasLinkPage,
    id: payload.id,
    isActive: payload.isActive,
    scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
    slug: payload.slug,
  };
}
