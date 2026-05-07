import { describe, expect, it } from "vitest";
import {
  buildShortUrlPreview,
  normalizeShortUrlBase,
} from "../../src/lib/links/preview";

describe("link preview helpers", () => {
  it("should normalize a configured base URL", () => {
    expect(normalizeShortUrlBase("https://linksnap.test/")).toBe(
      "https://linksnap.test",
    );
  });

  it("should build a short URL preview from a slug", () => {
    expect(buildShortUrlPreview("https://linksnap.test/", " promo ")).toBe(
      "https://linksnap.test/promo",
    );
  });

  it("should fall back to the placeholder slug when slug is blank", () => {
    expect(buildShortUrlPreview(null, "")).toBe("https://www.justqiu.cloud/your-slug");
  });
});
