import { describe, expect, it } from "vitest";
import {
  getClientIpFromHeaders,
  hashIpAddress,
  normalizeIpAddress,
} from "../../src/lib/analytics/ip";

describe("analytics IP helpers", () => {
  it("should normalize IPv4, IPv4 with port, and bracketed IPv6 addresses", () => {
    expect(normalizeIpAddress("203.0.113.10")).toBe("203.0.113.10");
    expect(normalizeIpAddress("203.0.113.10:443")).toBe("203.0.113.10");
    expect(normalizeIpAddress("[2001:db8::1]:443")).toBe("2001:db8::1");
    expect(normalizeIpAddress("not-an-ip")).toBeNull();
  });

  it("should read the first valid client IP from trusted proxy headers", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.2",
    });

    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("should hash IP addresses with SHA256 when a salt is available", () => {
    const hash = hashIpAddress("203.0.113.10", "test-salt");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe("203.0.113.10");
  });

  it("should return null when IP or salt is missing", () => {
    expect(hashIpAddress(null, "test-salt")).toBeNull();
    expect(hashIpAddress("203.0.113.10", null)).toBeNull();
  });
});
