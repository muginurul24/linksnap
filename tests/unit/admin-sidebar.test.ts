import { describe, it, expect } from "vitest";
import { isSidebarItemActive, shouldShowSidebarUpgradeCard } from "@/components/dashboard/app-sidebar";

describe("isSidebarItemActive", () => {
  it("exact match for /dashboard", () => {
    expect(isSidebarItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isSidebarItemActive("/dashboard/links", "/dashboard")).toBe(false);
  });

  it("exact match for /settings", () => {
    expect(isSidebarItemActive("/settings", "/settings")).toBe(true);
    expect(isSidebarItemActive("/settings/billing", "/settings")).toBe(false);
  });

  it("exact match for /admin", () => {
    expect(isSidebarItemActive("/admin", "/admin")).toBe(true);
    expect(isSidebarItemActive("/admin/users", "/admin")).toBe(false);
  });

  it("prefix match for other routes", () => {
    expect(isSidebarItemActive("/links", "/links")).toBe(true);
    expect(isSidebarItemActive("/links/new", "/links")).toBe(true);
    expect(isSidebarItemActive("/admin/users", "/admin/users")).toBe(true);
    expect(isSidebarItemActive("/admin/users/some-id", "/admin/users")).toBe(true);
  });
});

describe("shouldShowSidebarUpgradeCard", () => {
  it("shows for FREE", () => {
    expect(shouldShowSidebarUpgradeCard("FREE")).toBe(true);
  });

  it("hides for PRO", () => {
    expect(shouldShowSidebarUpgradeCard("PRO")).toBe(false);
  });

  it("hides for BUSINESS", () => {
    expect(shouldShowSidebarUpgradeCard("BUSINESS")).toBe(false);
  });
});
