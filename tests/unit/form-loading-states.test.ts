import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("form loading states", () => {
  it("should keep auth forms disabled with submit spinners", () => {
    for (const file of [
      "src/app/(marketing)/login/login-form.tsx",
      "src/app/(marketing)/register/register-form.tsx",
      "src/app/(marketing)/verify/verify-email-form.tsx",
      "src/app/(marketing)/forgot-password/forgot-password-form.tsx",
      "src/app/(marketing)/reset-password/reset-password-form.tsx",
    ]) {
      const source = readSource(file);

      expect(source).toContain("aria-busy=");
      expect(source).toContain("disabled=");
      expect(source).toContain("Loader2");
      expect(source).toContain("animate-spin");
    }
  });

  it("should expose busy submit states for dashboard forms", () => {
    const linkForm = readSource("src/app/(dashboard)/links/link-form.tsx");
    const campaignForm = readSource(
      "src/app/(dashboard)/campaigns/campaign-form.tsx",
    );

    expect(linkForm).toContain("aria-busy={isSubmitting}");
    expect(linkForm).toContain("disabled={isSubmitting}");
    expect(linkForm).toContain("Loader2");
    expect(campaignForm).toContain("aria-busy={isSubmitting}");
    expect(campaignForm).toContain("disabled={isSubmitting}");
    expect(campaignForm).toContain("Loader2");
  });

  it("should disable settings controls while saves are in flight", () => {
    const settingsForms = readSource(
      "src/app/(dashboard)/settings/settings-forms.tsx",
    );

    expect(settingsForms).toContain("aria-busy={isSaving}");
    expect(settingsForms).toContain("disabled={isSaving}");
    expect(settingsForms).toContain("Loader2");
    expect(settingsForms).toContain("<Switch");
  });

  it("should keep billing upgrade button busy and disabled while checkout starts", () => {
    const upgradeButton = readSource(
      "src/app/(dashboard)/settings/billing/upgrade-button.tsx",
    );

    expect(upgradeButton).toContain("aria-busy={isLoading}");
    expect(upgradeButton).toContain("disabled={current || isLoading}");
    expect(upgradeButton).toContain("Loader2");
  });
});
