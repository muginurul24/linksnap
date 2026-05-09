import { describe, expect, it } from "vitest";
import {
  finishSingleFlight,
  tryStartSingleFlight,
  type SingleFlightGuard,
} from "@/lib/actions/single-flight";

describe("single-flight action guard", () => {
  it("should allow one in-flight action and block duplicates until finished", () => {
    const guard: SingleFlightGuard = { current: false };

    expect(tryStartSingleFlight(guard)).toBe(true);
    expect(tryStartSingleFlight(guard)).toBe(false);

    finishSingleFlight(guard);

    expect(tryStartSingleFlight(guard)).toBe(true);
  });
});
