import { describe, expect, it } from "vitest";
import {
  SESSION_TIMEOUT_WARNING_MS,
  formatSessionRemaining,
  getSessionTimeoutState,
} from "../../src/components/dashboard/session-timeout";

describe("session timeout", () => {
  it("should stay hidden when no expiry is available", () => {
    expect(getSessionTimeoutState({ expiresAt: null })).toEqual({
      expired: false,
      remainingMs: Number.POSITIVE_INFINITY,
      shouldWarn: false,
    });
  });

  it("should warn during the final five minutes", () => {
    const now = Date.parse("2026-05-07T00:00:00.000Z");
    const expiresAt = new Date(now + SESSION_TIMEOUT_WARNING_MS).toISOString();

    expect(getSessionTimeoutState({ expiresAt, now })).toEqual({
      expired: false,
      remainingMs: SESSION_TIMEOUT_WARNING_MS,
      shouldWarn: true,
    });
  });

  it("should mark expired sessions", () => {
    const now = Date.parse("2026-05-07T00:05:01.000Z");
    const expiresAt = "2026-05-07T00:05:00.000Z";

    expect(getSessionTimeoutState({ expiresAt, now })).toEqual({
      expired: true,
      remainingMs: 0,
      shouldWarn: false,
    });
  });

  it("should format remaining time", () => {
    expect(formatSessionRemaining(5 * 60 * 1000)).toBe("5:00");
    expect(formatSessionRemaining(61_000)).toBe("1:01");
  });
});
