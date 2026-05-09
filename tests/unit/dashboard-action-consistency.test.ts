import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

const guardedActionFiles = [
  "src/app/(dashboard)/settings/billing/upgrade-button.tsx",
  "src/components/admin/plan-override-dialog.tsx",
  "src/app/(dashboard)/admin/users/[id]/page.tsx",
  "src/app/(dashboard)/links/link-actions.tsx",
  "src/app/(dashboard)/links/link-form.tsx",
  "src/app/(dashboard)/campaigns/campaign-actions.tsx",
  "src/app/(dashboard)/campaigns/campaign-form.tsx",
  "src/app/(dashboard)/settings/api-keys-panel.tsx",
  "src/app/(dashboard)/settings/settings-forms.tsx",
  "src/app/(dashboard)/settings/two-factor-panel.tsx",
] as const;

describe("dashboard action consistency", () => {
  for (const file of guardedActionFiles) {
    it(`should guard duplicate submissions in ${file}`, () => {
      const source = readSource(file);

      expect(source).toContain("tryStartSingleFlight");
      expect(source).toContain("finishSingleFlight");
    });
  }

  it("should keep destructive confirmation buttons accessible while busy", () => {
    const source = readSource("src/components/dashboard/delete-confirmation-dialog.tsx");

    expect(source).toContain("aria-busy={isDeleting}");
    expect(source).toContain("disabled={isDeleting}");
    expect(source).toContain("DialogTitle");
    expect(source).toContain("DialogDescription");
  });

  it("should keep high-risk success toasts after successful server responses", () => {
    const linkForm = readSource("src/app/(dashboard)/links/link-form.tsx");
    const billingButton = readSource(
      "src/app/(dashboard)/settings/billing/upgrade-button.tsx",
    );

    expect(linkForm.indexOf("if (!body.success)")).toBeLessThan(
      linkForm.indexOf("toast.success(feedback.message"),
    );
    expect(billingButton).not.toContain("toast.success");
    expect(billingButton.indexOf("if (!body.success)")).toBeLessThan(
      billingButton.indexOf("window.location.assign(redirectUrl)"),
    );
  });
});
