import { describe, it, expect } from "vitest";
import { isSuperAdmin } from "@/lib/auth/superadmin-utils";
import { resolveEffectivePlan } from "@/lib/links/limits";

describe("isSuperAdmin", () => {
  it("returns true for superadmin role", () => {
    expect(isSuperAdmin("superadmin")).toBe(true);
  });

  it("returns false for null/undefined/empty", () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin("")).toBe(false);
  });

  it("returns false for non-superadmin roles", () => {
    expect(isSuperAdmin("user")).toBe(false);
    expect(isSuperAdmin("USER")).toBe(false);
    expect(isSuperAdmin("admin")).toBe(false);
    expect(isSuperAdmin("SUPERADMIN")).toBe(false);
  });
});

describe("resolveEffectivePlan", () => {
  it("returns BUSINESS for superadmin regardless of stored plan", () => {
    expect(resolveEffectivePlan("FREE", "superadmin")).toBe("BUSINESS");
    expect(resolveEffectivePlan("PRO", "superadmin")).toBe("BUSINESS");
    expect(resolveEffectivePlan("BUSINESS", "superadmin")).toBe("BUSINESS");
  });

  it("returns stored plan for non-superadmin users", () => {
    expect(resolveEffectivePlan("FREE", "user")).toBe("FREE");
    expect(resolveEffectivePlan("PRO", "user")).toBe("PRO");
    expect(resolveEffectivePlan("BUSINESS", "user")).toBe("BUSINESS");
  });

  it("returns stored plan when role is null/undefined", () => {
    expect(resolveEffectivePlan("FREE", null)).toBe("FREE");
    expect(resolveEffectivePlan("PRO", undefined)).toBe("PRO");
    expect(resolveEffectivePlan("FREE")).toBe("FREE");
  });

  it("returns stored plan for empty role string", () => {
    expect(resolveEffectivePlan("PRO", "")).toBe("PRO");
  });
});
