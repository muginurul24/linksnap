import { describe, expect, it } from "vitest";
import { getSidebarDisplayUser } from "../../src/components/dashboard/app-sidebar";

describe("app sidebar user display", () => {
  it("should render the matching plan label for each user plan", () => {
    expect(getSidebarDisplayUser({ plan: "FREE" }).planLabel).toBe("Free Plan");
    expect(getSidebarDisplayUser({ plan: "PRO" }).planLabel).toBe("Pro Plan");
    expect(getSidebarDisplayUser({ plan: "BUSINESS" }).planLabel).toBe(
      "Business Plan",
    );
  });

  it("should use provided account identity and avatar image", () => {
    expect(getSidebarDisplayUser({
      email: "rafi@example.com",
      image: "https://example.com/avatar.png",
      name: "Rafi Firmansyah",
      plan: "PRO",
    })).toEqual({
      avatarFallback: "RF",
      avatarUrl: "https://example.com/avatar.png",
      email: "rafi@example.com",
      name: "Rafi Firmansyah",
      planLabel: "Pro Plan",
    });
  });

  it("should fall back when account identity is missing", () => {
    expect(getSidebarDisplayUser({ plan: "FREE" })).toEqual({
      avatarFallback: "U",
      avatarUrl: undefined,
      email: "user@email.com",
      name: "User",
      planLabel: "Free Plan",
    });
  });
});
