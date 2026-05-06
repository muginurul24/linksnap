import { describe, expect, it } from "vitest";
import {
  createLinkSchema,
  isSafeDestinationUrl,
  linkAnalyticsQuerySchema,
  listLinksQuerySchema,
  updateLinkSchema,
} from "../../src/lib/validations/link";

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

  it("should parse list query defaults when query params are omitted", () => {
    const parsed = listLinksQuerySchema.safeParse({});

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ limit: 20, page: 1 });
  });

  it("should coerce and trim list query params", () => {
    const parsed = listLinksQuerySchema.safeParse({
      campaignId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      limit: "10",
      page: "2",
      search: " promo ",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({
      campaignId: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      limit: 10,
      page: 2,
      search: "promo",
    });
  });

  it("should reject unknown list query params", () => {
    const parsed = listLinksQuerySchema.safeParse({ sort: "clicks" });

    expect(parsed.success).toBe(false);
  });

  it("should normalize valid update input", () => {
    const parsed = updateLinkSchema.safeParse({
      destinationUrl: " https://example.com/updated ",
      title: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({
      destinationUrl: "https://example.com/updated",
      title: null,
    });
  });

  it("should reject empty update input", () => {
    const parsed = updateLinkSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });

  it("should parse analytics date range query params", () => {
    const parsed = linkAnalyticsQuerySchema.safeParse({
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-06T00:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({
      from: new Date("2026-05-01T00:00:00.000Z"),
      to: new Date("2026-05-06T00:00:00.000Z"),
    });
  });

  it("should reject unknown analytics query params", () => {
    const parsed = linkAnalyticsQuerySchema.safeParse({ range: "all" });

    expect(parsed.success).toBe(false);
  });
});
