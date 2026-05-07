import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(path: string): string {
  return readFileSync(path, "utf8");
}

describe("mobile navigation polish", () => {
  it("should keep the mobile sidebar closed by default", () => {
    const layout = readSource("src/app/(dashboard)/layout.tsx");
    const sidebar = readSource("src/components/ui/sidebar.tsx");

    expect(layout).toContain("defaultOpenMobile={false}");
    expect(sidebar).toContain("defaultOpenMobile = false");
  });

  it("should hide nonessential links table columns on mobile", () => {
    const linksPage = readSource("src/app/(dashboard)/links/page.tsx");

    expect(linksPage).toContain("hidden text-right sm:table-cell");
    expect(linksPage).toContain("hidden md:table-cell");
    expect(linksPage).toContain("hidden lg:table-cell");
  });

  it("should stack billing plan cards on mobile", () => {
    const billingPage = readSource(
      "src/app/(dashboard)/settings/billing/page.tsx",
    );

    expect(billingPage).toContain("grid grid-cols-1 gap-4 md:grid-cols-3");
  });
});
