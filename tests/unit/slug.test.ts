import { describe, expect, it } from "vitest";
import { generateRandomSlug } from "../../src/lib/links/slug";

describe("slug generation", () => {
  it("should generate a 7-character lowercase alphanumeric slug by default", () => {
    const slug = generateRandomSlug();

    expect(slug).toHaveLength(7);
    expect(slug).toMatch(/^[a-z0-9]{7}$/);
  });

  it("should generate a slug with the requested length", () => {
    const slug = generateRandomSlug(12);

    expect(slug).toHaveLength(12);
    expect(slug).toMatch(/^[a-z0-9]{12}$/);
  });
});
