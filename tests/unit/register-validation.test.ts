import { describe, expect, it } from "vitest";
import { registerSchema } from "../../src/lib/validations/auth";

describe("register validation", () => {
  it("should accept registration input when email and passwords are valid", () => {
    const result = registerSchema.safeParse({
      email: " user@example.com ",
      password: "Password1",
      confirmPassword: "Password1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("should reject registration input when email is invalid", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      password: "Password1",
      confirmPassword: "Password1",
    });

    expect(result.success).toBe(false);
  });

  it("should reject registration input when password is weak", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "password",
      confirmPassword: "password",
    });

    expect(result.success).toBe(false);
  });

  it("should reject registration input when passwords do not match", () => {
    const result = registerSchema.safeParse({
      email: "user@example.com",
      password: "Password1",
      confirmPassword: "Password2",
    });

    expect(result.success).toBe(false);
  });
});
