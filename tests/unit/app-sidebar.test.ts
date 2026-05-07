import { describe, expect, it } from "vitest";
import {
  getSidebarMainNavItems,
  getSidebarDisplayUser,
  getSignOutMenuLabel,
  isSidebarItemActive,
  SIDEBAR_UPGRADE_CARD_COPY,
  shouldShowSidebarUpgradeCard,
} from "../../src/components/dashboard/app-sidebar";

describe("app sidebar user display", () => {
  it("should render the matching plan label for each user plan", () => {
    expect(getSidebarDisplayUser({}, "FREE").planLabel).toBe("Free Plan");
    expect(getSidebarDisplayUser({}, "PRO").planLabel).toBe("Pro Plan");
    expect(getSidebarDisplayUser({}, "BUSINESS").planLabel).toBe(
      "Business Plan",
    );
  });

  it("should use provided account identity and avatar image", () => {
    expect(getSidebarDisplayUser({
      email: "rafi@example.com",
      image: "https://example.com/avatar.png",
      name: "Rafi Firmansyah",
    }, "PRO")).toEqual({
      avatarFallback: "RF",
      avatarUrl: "https://example.com/avatar.png",
      email: "rafi@example.com",
      name: "Rafi Firmansyah",
      planLabel: "Pro Plan",
    });
  });

  it("should fall back when account identity is missing", () => {
    expect(getSidebarDisplayUser({}, "FREE")).toEqual({
      avatarFallback: "U",
      avatarUrl: undefined,
      email: "user@email.com",
      name: "User",
      planLabel: "Free Plan",
    });
  });

  it("should only mark settings active on the exact settings route", () => {
    expect(isSidebarItemActive("/settings", "/settings")).toBe(true);
    expect(isSidebarItemActive("/settings/billing", "/settings")).toBe(false);
    expect(isSidebarItemActive("/settings/billing", "/settings/billing")).toBe(
      true,
    );
  });

  it("should keep nested non-settings routes active", () => {
    expect(isSidebarItemActive("/links/new", "/links")).toBe(true);
    expect(isSidebarItemActive("/dashboard/extra", "/dashboard")).toBe(false);
  });

  it("should show API docs navigation only for paid plans", () => {
    expect(getSidebarMainNavItems("FREE").map((item) => item.title)).not.toContain(
      "API Docs",
    );
    expect(getSidebarMainNavItems("PRO").map((item) => item.title)).toContain(
      "API Docs",
    );
    expect(getSidebarMainNavItems("BUSINESS").map((item) => item.title)).toContain(
      "API Docs",
    );
  });

  it("should show the upgrade card only for free users", () => {
    expect(shouldShowSidebarUpgradeCard("FREE")).toBe(true);
    expect(shouldShowSidebarUpgradeCard("PRO")).toBe(false);
    expect(shouldShowSidebarUpgradeCard("BUSINESS")).toBe(false);
  });

  it("should use accurate upgrade card copy", () => {
    expect(SIDEBAR_UPGRADE_CARD_COPY).toBe(
      "Unlock 500 links, 50 Link Pages, 10 campaigns, A/B testing, and API access",
    );
    expect(SIDEBAR_UPGRADE_CARD_COPY).not.toContain("unlimited links");
  });

  it("should label sign out loading state", () => {
    expect(getSignOutMenuLabel(false)).toBe("Sign Out");
    expect(getSignOutMenuLabel(true)).toBe("Signing out...");
  });
});
