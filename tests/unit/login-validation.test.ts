import { describe, expect, it } from "vitest";
import { loginSchema } from "../../src/lib/validations/auth";

describe("login validation", () => {
  it("should accept login input when email and password are present", () => {
    const result = loginSchema.safeParse({
      email: " user@example.com ",
      password: "Password1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("should reject login input when email is invalid", () => {
    const result = loginSchema.safeParse({
      email: "invalid",
      password: "Password1",
    });

    expect(result.success).toBe(false);
  });

  it("should reject login input when password is missing", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});
