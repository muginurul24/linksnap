import { describe, expect, it } from "vitest";
import {
  fromRedirectLinkCachePayload,
  getRedirectCacheKey,
  isPublicSlug,
  isRedirectLinkAvailable,
  toRedirectLinkCachePayload,
  type RedirectLink,
} from "../../src/lib/links/redirect";

function createRedirectLink(overrides: Partial<RedirectLink> = {}): RedirectLink {
  return {
    clickCount: 0,
    destinationUrl: "https://example.com",
    expiresAt: null,
    hasLinkPage: false,
    id: "link-1",
    isActive: true,
    scheduledAt: null,
    slug: "promo",
    ...overrides,
  };
}

describe("redirect helpers", () => {
  it("should accept valid public slugs when format matches link rules", () => {
    expect(isPublicSlug("promo-123")).toBe(true);
    expect(isPublicSlug("ab")).toBe(false);
    expect(isPublicSlug("Promo_123")).toBe(false);
  });

  it("should build redirect cache keys when given a slug", () => {
    expect(getRedirectCacheKey("promo")).toBe("redirect:promo");
  });

  it("should allow redirects when link is active and inside schedule window", () => {
    const link = createRedirectLink({
      expiresAt: new Date("2026-05-06T11:00:00.000Z"),
      scheduledAt: new Date("2026-05-06T09:00:00.000Z"),
    });

    expect(isRedirectLinkAvailable(link, new Date("2026-05-06T10:00:00.000Z"))).toBe(
      true,
    );
  });

  it("should block redirects when link is inactive", () => {
    const link = createRedirectLink({ isActive: false });

    expect(isRedirectLinkAvailable(link, new Date("2026-05-06T10:00:00.000Z"))).toBe(
      false,
    );
  });

  it("should block redirects when scheduled time is still in the future", () => {
    const link = createRedirectLink({
      scheduledAt: new Date("2026-05-06T11:00:00.000Z"),
    });

    expect(isRedirectLinkAvailable(link, new Date("2026-05-06T10:00:00.000Z"))).toBe(
      false,
    );
  });

  it("should block redirects when expiration time has passed", () => {
    const link = createRedirectLink({
      expiresAt: new Date("2026-05-06T10:00:00.000Z"),
    });

    expect(isRedirectLinkAvailable(link, new Date("2026-05-06T10:00:00.000Z"))).toBe(
      false,
    );
  });

  it("should preserve redirect dates when converting to and from cache payloads", () => {
    const link = createRedirectLink({
      expiresAt: new Date("2026-05-06T12:00:00.000Z"),
      scheduledAt: new Date("2026-05-06T08:00:00.000Z"),
    });

    const payload = toRedirectLinkCachePayload(link);
    const restored = fromRedirectLinkCachePayload(payload);

    expect(payload).toMatchObject({
      expiresAt: "2026-05-06T12:00:00.000Z",
      scheduledAt: "2026-05-06T08:00:00.000Z",
    });
    expect(restored).toEqual(link);
  });
});
