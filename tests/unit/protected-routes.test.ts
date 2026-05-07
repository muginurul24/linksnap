import { describe, expect, it } from "vitest";
import { isProtectedPath } from "../../src/lib/auth/protected-routes";

describe("protected route matching", () => {
  it("should protect dashboard routes when path targets dashboard surfaces", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/dashboard/links")).toBe(true);
    expect(isProtectedPath("/links")).toBe(true);
    expect(isProtectedPath("/links/new")).toBe(true);
    expect(isProtectedPath("/docs")).toBe(true);
    expect(isProtectedPath("/settings/billing")).toBe(true);
  });

  it("should keep public routes unprotected when path targets marketing or auth surfaces", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/register")).toBe(false);
    expect(isProtectedPath("/verify")).toBe(false);
    expect(isProtectedPath("/blog")).toBe(false);
  });
});
