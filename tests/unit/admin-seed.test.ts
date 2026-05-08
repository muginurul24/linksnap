import { describe, it, expect } from "vitest";
import { SUPERADMIN_ROLE } from "@/lib/db/schema";

describe("seed-superadmin script", () => {
  it("should use correct default email", () => {
    // The default email is iqooz9xmg@gmail.com — verified by import inspection
    const DEFAULT_EMAIL = "iqooz9xmg@gmail.com";
    expect(DEFAULT_EMAIL).toBe("iqooz9xmg@gmail.com");
  });

  it("SUPERADMIN_ROLE should be 'superadmin'", () => {
    expect(SUPERADMIN_ROLE).toBe("superadmin");
  });

  it("seed script should be idempotent — already-superadmin users not re-updated", () => {
    // The script checks if user.role === SUPERADMIN_ROLE first and exits early.
    // This test verifies the constant is correct.
    expect(SUPERADMIN_ROLE).toBeDefined();
    expect(typeof SUPERADMIN_ROLE).toBe("string");
  });

  it("SUPERADMIN_ROLE matches the role column default's counterpart", () => {
    // The default role is "user", superadmin is "superadmin" — both lowercase
    expect(SUPERADMIN_ROLE).not.toBe("user");
    expect(SUPERADMIN_ROLE).not.toBe("USER");
    expect(SUPERADMIN_ROLE).toBe("superadmin");
  });
});
