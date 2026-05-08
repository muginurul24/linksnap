import { errorResponse } from "@/lib/api/response";
import {
  decodeCreatedAtCursor,
  type CreatedAtCursor,
} from "@/lib/pagination/cursor";

export function parseCreatedAtCursorParam(
  cursor: string | undefined,
  requestId: string,
): { cursor?: CreatedAtCursor } | { response: Response } {
  if (!cursor) return {};

  const parsed = decodeCreatedAtCursor(cursor);
  if (parsed) return { cursor: parsed };

  return {
    response: errorResponse(
      "VALIDATION_ERROR",
      "Invalid cursor.",
      400,
      requestId,
      {
        fieldErrors: { cursor: ["Cursor is invalid."] },
        formErrors: [],
      },
    ),
  };
}

export function createListMeta({
  cursor,
  limit,
  nextCursor,
  page,
  total,
}: {
  cursor?: string;
  limit: number;
  nextCursor: string | null;
  page: number;
  total: number;
}): Record<string, number | string | null> {
  if (cursor) {
    return { limit, nextCursor, total };
  }

  return { limit, page, total };
}
