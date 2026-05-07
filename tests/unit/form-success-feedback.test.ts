import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { getCampaignSubmitSuccessFeedback } from "../../src/app/(dashboard)/campaigns/campaign-form";
import { getLinkSubmitSuccessFeedback } from "../../src/app/(dashboard)/links/link-form";
import {
  PASSWORD_SUCCESS_CLEAR_DELAY_MS,
  getPasswordInputType,
  passwordChangeSuccessDetails,
  settingsSuccessMessages,
} from "../../src/app/(dashboard)/settings/settings-forms";

describe("form success feedback", () => {
  it("should redirect to links after creating a link", () => {
    expect(
      getLinkSubmitSuccessFeedback({
        isEditMode: false,
        shortUrl: "https://justqiu.cloud/promo",
      }),
    ).toEqual({
      description: "https://justqiu.cloud/promo",
      message: "Link created",
      redirectTo: "/links",
    });
  });

  it("should stay on the current page after editing a link", () => {
    expect(
      getLinkSubmitSuccessFeedback({
        isEditMode: true,
        shortUrl: "https://justqiu.cloud/promo",
      }),
    ).toEqual({
      description: "https://justqiu.cloud/promo",
      message: "Link updated",
      redirectTo: null,
    });
  });

  it("should redirect to campaigns after creating or editing campaigns", () => {
    expect(
      getCampaignSubmitSuccessFeedback({
        isEditMode: false,
        name: "Launch",
      }),
    ).toEqual({
      description: "Launch",
      message: "Campaign created",
      redirectTo: "/campaigns",
    });
    expect(
      getCampaignSubmitSuccessFeedback({
        isEditMode: true,
        name: "Launch",
      }),
    ).toEqual({
      description: "Launch",
      message: "Campaign updated",
      redirectTo: "/campaigns",
    });
  });

  it("should expose the requested settings success messages", () => {
    expect(settingsSuccessMessages).toEqual({
      notifications: "Preferences saved",
      password: "Password changed",
      profile: "Profile updated",
    });
  });

  it("should expose password change UX helpers", () => {
    expect(getPasswordInputType(false)).toBe("password");
    expect(getPasswordInputType(true)).toBe("text");
    expect(PASSWORD_SUCCESS_CLEAR_DELAY_MS).toBeGreaterThanOrEqual(2000);
    expect(passwordChangeSuccessDetails).toEqual({
      description: "Your password was changed successfully.",
      signOutOtherDevicesLabel: "Sign out other devices",
    });
  });
});
