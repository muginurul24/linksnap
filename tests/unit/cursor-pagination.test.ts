import { describe, expect, it } from "vitest";
import {
  decodeCreatedAtCursor,
  encodeCreatedAtCursor,
  getCursorPage,
} from "@/lib/pagination/cursor";

const cursorInput = {
  createdAt: new Date("2026-05-06T10:00:00.000Z"),
  id: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
};

describe("cursor pagination", () => {
  it("should encode and decode createdAt cursors", () => {
    const encoded = encodeCreatedAtCursor(cursorInput);

    expect(decodeCreatedAtCursor(encoded)).toEqual(cursorInput);
  });

  it("should reject invalid cursor payloads", () => {
    expect(decodeCreatedAtCursor("not-base64")).toBeNull();
    expect(
      decodeCreatedAtCursor(
        Buffer.from(
          JSON.stringify({
            createdAt: "not-a-date",
            id: cursorInput.id,
            version: 1,
          }),
          "utf8",
        ).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("should trim cursor pages and return the next cursor from the last item", () => {
    const result = getCursorPage(
      [
        cursorInput,
        {
          createdAt: new Date("2026-05-05T10:00:00.000Z"),
          id: "7c4a7a24-7348-4a94-81c6-b837364cf605",
        },
      ],
      1,
    );

    expect(result.items).toEqual([cursorInput]);
    expect(decodeCreatedAtCursor(result.nextCursor ?? "")).toEqual(cursorInput);
  });
});
