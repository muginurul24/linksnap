export type CreatedAtCursor = {
  createdAt: Date;
  id: string;
};

const CURSOR_VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CursorPayload = {
  createdAt: string;
  id: string;
  version: typeof CURSOR_VERSION;
};

export function encodeCreatedAtCursor({
  createdAt,
  id,
}: CreatedAtCursor): string {
  const payload: CursorPayload = {
    createdAt: createdAt.toISOString(),
    id,
    version: CURSOR_VERSION,
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCreatedAtCursor(value: string): CreatedAtCursor | null {
  try {
    const payload = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<CursorPayload>;

    if (payload.version !== CURSOR_VERSION) return null;
    if (typeof payload.id !== "string" || !UUID_PATTERN.test(payload.id)) {
      return null;
    }
    if (typeof payload.createdAt !== "string") return null;

    const createdAt = new Date(payload.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;

    return { createdAt, id: payload.id };
  } catch {
    return null;
  }
}

export function getCursorPage<T extends CreatedAtCursor>(
  items: T[],
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const pageItems = items.slice(0, limit);
  const nextCursor =
    items.length > limit && pageItems.length > 0
      ? encodeCreatedAtCursor(pageItems[pageItems.length - 1] as T)
      : null;

  return { items: pageItems, nextCursor };
}
