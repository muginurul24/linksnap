import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "../../src/lib/validations/auth";
import {
  notificationPreferencesSchema,
  settingsProfileSchema,
} from "../../src/lib/validations/settings";

describe("settings validation", () => {
  it("should trim profile names and convert blank names to null", () => {
    expect(settingsProfileSchema.parse({ name: "  Rafi  " })).toEqual({
      name: "Rafi",
    });
    expect(settingsProfileSchema.parse({ name: "   " })).toEqual({
      name: null,
    });
  });

  it("should reject unknown profile fields", () => {
    const parsed = settingsProfileSchema.safeParse({
      email: "attacker@example.com",
      name: "User",
    });

    expect(parsed.success).toBe(false);
  });

  it("should validate password changes with confirmation", () => {
    const parsed = changePasswordSchema.safeParse({
      confirmPassword: "Password2",
      currentPassword: "Password1",
      password: "Password2",
    });

    expect(parsed.success).toBe(true);
  });

  it("should reject weak or mismatched password changes", () => {
    expect(
      changePasswordSchema.safeParse({
        confirmPassword: "Password2",
        currentPassword: "Password1",
        password: "short",
      }).success,
    ).toBe(false);

    expect(
      changePasswordSchema.safeParse({
        confirmPassword: "Password3",
        currentPassword: "Password1",
        password: "Password2",
      }).success,
    ).toBe(false);
  });

  it("should require all notification preference booleans", () => {
    expect(
      notificationPreferencesSchema.parse({
        linkPerformanceAlerts: false,
        paymentConfirmations: true,
        productUpdates: false,
        weeklyAnalyticsReport: true,
      }),
    ).toEqual({
      linkPerformanceAlerts: false,
      paymentConfirmations: true,
      productUpdates: false,
      weeklyAnalyticsReport: true,
    });

    expect(
      notificationPreferencesSchema.safeParse({
        paymentConfirmations: true,
      }).success,
    ).toBe(false);
  });
});
