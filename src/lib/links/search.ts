export const LINKS_SEARCH_MAX_LENGTH = 100;
export const LINKS_SEARCH_DEBOUNCE_MS = 300;

export function getLinksSearchQuery(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;

  const search = raw.trim();
  if (!search || search.length > LINKS_SEARCH_MAX_LENGTH) return undefined;

  return search;
}

export function buildLinksSearchHref(value: unknown): string {
  const search = getLinksSearchQuery(value);
  if (!search) return "/links";

  return `/links?${new URLSearchParams({ search }).toString()}`;
}

export function shouldNavigateLinksSearch(
  currentHref: string,
  value: unknown,
): boolean {
  return buildLinksSearchHref(value) !== currentHref;
}
