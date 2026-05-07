import { describe, expect, it } from "vitest";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../../src/lib/db/schema";
import { normalizeNotificationPreferences } from "../../src/lib/db/queries/settings";

describe("settings queries", () => {
  it("should default null notification preferences", () => {
    expect(normalizeNotificationPreferences(null)).toEqual(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
  });

  it("should preserve existing notification preferences", () => {
    const preferences = {
      linkPerformanceAlerts: false,
      paymentConfirmations: true,
      productUpdates: false,
      weeklyAnalyticsReport: true,
    };

    expect(normalizeNotificationPreferences(preferences)).toEqual(preferences);
  });
});
