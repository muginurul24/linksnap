import { describe, expect, it } from "vitest";
import { createLinkSchema, isSafeDestinationUrl } from "../../src/lib/validations/link";

describe("link validation", () => {
  it("should normalize valid create link input when optional fields are blank", () => {
    const parsed = createLinkSchema.safeParse({
      destinationUrl: " https://example.com/path?q=1 ",
      slug: "",
      title: " Campaign Link ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    expect(parsed.data).toEqual({
      destinationUrl: "https://example.com/path?q=1",
      title: "Campaign Link",
    });
  });

  it("should accept lowercase slugs with numbers and hyphens", () => {
    const parsed = createLinkSchema.safeParse({
      destinationUrl: "https://example.com",
      slug: "promo-123",
    });

    expect(parsed.success).toBe(true);
  });

  it("should reject invalid slugs when they contain unsupported characters", () => {
    const parsed = createLinkSchema.safeParse({
      destinationUrl: "https://example.com",
      slug: "Promo_123",
    });

    expect(parsed.success).toBe(false);
  });

  it("should reject unknown fields", () => {
    const parsed = createLinkSchema.safeParse({
      destinationUrl: "https://example.com",
      unexpected: true,
    });

    expect(parsed.success).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/plain,hello",
    "file:///etc/passwd",
    "http://localhost:3000",
    "http://127.0.0.1/admin",
    "http://10.0.0.1/admin",
    "http://172.16.0.1/admin",
    "http://192.168.1.1/admin",
    "http://[::1]/admin",
    "http://[::ffff:7f00:1]/admin",
  ])("should reject unsafe destination URL %s", (url) => {
    expect(isSafeDestinationUrl(url)).toBe(false);
  });

  it("should allow public HTTP and HTTPS destination URLs", () => {
    expect(isSafeDestinationUrl("https://example.com/path")).toBe(true);
    expect(isSafeDestinationUrl("http://example.com/path")).toBe(true);
  });
});
