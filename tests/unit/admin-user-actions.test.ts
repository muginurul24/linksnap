import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("admin user action reliability", () => {
  it("should route admin user mutations through the shared browser API client", () => {
    const source = readSource("src/app/(dashboard)/admin/users/[id]/page.tsx");

    expect(source).toContain("import { apiFetch, getFriendlyApiErrorMessage }");
    expect(source).toContain("method: \"PATCH\"");
    expect(source).toContain("method: \"POST\"");
    expect(source).toContain("await apiFetch(`/api/v1/admin/users/${id}`");
    expect(source).not.toContain("throw new Error(\"Failed to update plan\")");
    expect(source).not.toContain("confirm(\"Are you sure");
  });

  it("should keep plan update failures inside the dialog instead of bubbling promises", () => {
    const source = readSource("src/components/admin/plan-override-dialog.tsx");

    expect(source).toContain("catch (err)");
    expect(source).toContain("setSubmitError(err)");
    expect(source).toContain("<ApiErrorNotice error={submitError}");
    expect(source).toContain("title=\"Plan update failed\"");
  });
});
