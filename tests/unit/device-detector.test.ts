import { describe, expect, it } from "vitest";
import { detectDevice } from "../../src/lib/geo/device-detector";

describe("device detector", () => {
  it("should detect mobile browser and OS from iPhone user agent", () => {
    const result = detectDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(result).toEqual({
      browser: "Safari",
      device: "mobile",
      os: "iOS",
    });
  });

  it("should detect tablet browser and OS from iPad user agent", () => {
    const result = detectDevice(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(result).toEqual({
      browser: "Safari",
      device: "tablet",
      os: "iOS",
    });
  });

  it("should detect desktop browser and OS from Chrome user agent", () => {
    const result = detectDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    );

    expect(result).toEqual({
      browser: "Chrome",
      device: "desktop",
      os: "Windows",
    });
  });

  it("should detect crawlers as bots", () => {
    const result = detectDevice("Googlebot/2.1");

    expect(result).toEqual({
      browser: "Bot",
      device: "bot",
      os: "Unknown",
    });
  });

  it("should return unknown values for missing user agent", () => {
    expect(detectDevice(null)).toEqual({
      browser: "Unknown",
      device: "unknown",
      os: "Unknown",
    });
  });
});
