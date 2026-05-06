import { describe, expect, it } from "vitest";
import {
  formatCountdownValue,
  getCountdownState,
} from "../../src/components/link-page/countdown-timer";

describe("countdown timer helpers", () => {
  it("should format remaining time as DD:HH:MM:SS", () => {
    const state = getCountdownState(
      new Date("2026-05-08T12:03:04.000Z"),
      new Date("2026-05-07T10:00:00.000Z"),
    );

    expect(formatCountdownValue(state)).toBe("01:02:03:04");
  });

  it("should mark countdowns under one hour as urgent", () => {
    const state = getCountdownState(
      new Date("2026-05-07T10:59:59.000Z"),
      new Date("2026-05-07T10:00:00.000Z"),
    );

    expect(state.isExpired).toBe(false);
    expect(state.isUrgent).toBe(true);
  });

  it("should return an expired zero state after the target date", () => {
    const state = getCountdownState(
      new Date("2026-05-07T10:00:00.000Z"),
      new Date("2026-05-07T10:00:01.000Z"),
    );

    expect(state.isExpired).toBe(true);
    expect(state.isUrgent).toBe(false);
    expect(formatCountdownValue(state)).toBe("00:00:00:00");
  });
});
