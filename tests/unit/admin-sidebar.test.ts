import { describe, it, expect } from "vitest";
import {
  isSidebarItemActive,
  shouldShowSidebarUpgradeCard,
  getSidebarMainNavItems,
} from "@/components/dashboard/app-sidebar";

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
  it("shows for FREE without superadmin", () => {
    expect(shouldShowSidebarUpgradeCard("FREE")).toBe(true);
  });

  it("hides for superadmin with FREE plan", () => {
    expect(shouldShowSidebarUpgradeCard("FREE", "superadmin")).toBe(false);
  });

  it("hides for PRO", () => {
    expect(shouldShowSidebarUpgradeCard("PRO")).toBe(false);
  });

  it("hides for BUSINESS", () => {
    expect(shouldShowSidebarUpgradeCard("BUSINESS")).toBe(false);
  });
});

describe("getSidebarMainNavItems", () => {
  it("excludes API docs for FREE users", () => {
    const items = getSidebarMainNavItems("FREE");
    const hasApiDocs = items.some((item) => item.url === "/docs");
    expect(hasApiDocs).toBe(false);
  });

  it("includes API docs for PRO users", () => {
    const items = getSidebarMainNavItems("PRO");
    const hasApiDocs = items.some((item) => item.url === "/docs");
    expect(hasApiDocs).toBe(true);
  });

  it("includes API docs for superadmin regardless of plan", () => {
    const items = getSidebarMainNavItems("FREE", "superadmin");
    const hasApiDocs = items.some((item) => item.url === "/docs");
    expect(hasApiDocs).toBe(true);
  });

  it("includes API docs for BUSINESS", () => {
    const items = getSidebarMainNavItems("BUSINESS");
    const hasApiDocs = items.some((item) => item.url === "/docs");
    expect(hasApiDocs).toBe(true);
  });
});
