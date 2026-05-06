import { describe, expect, it } from "vitest";
import { parseUserAgent } from "../../src/lib/analytics/user-agent";

describe("user agent parser", () => {
  it("should parse mobile Safari on iOS", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(result).toEqual({
      browser: "Safari",
      device: "mobile",
      os: "iOS",
    });
  });

  it("should parse desktop Chrome on Windows", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );

    expect(result).toEqual({
      browser: "Chrome",
      device: "desktop",
      os: "Windows",
    });
  });

  it("should classify crawlers as bots", () => {
    const result = parseUserAgent("Googlebot/2.1");

    expect(result).toEqual({
      browser: "Bot",
      device: "bot",
      os: "Unknown",
    });
  });
});
