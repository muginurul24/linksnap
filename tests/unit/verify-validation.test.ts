import { describe, expect, it } from "vitest";
import { verifyEmailSchema } from "../../src/lib/validations/auth";

describe("email verification validation", () => {
  it("should accept verification input when email and otp are valid", () => {
    const result = verifyEmailSchema.safeParse({
      email: " user@example.com ",
      otp: "123456",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
    }
  });

  it("should reject verification input when otp is not six digits", () => {
    expect(
      verifyEmailSchema.safeParse({
        email: "user@example.com",
        otp: "12345",
      }).success,
    ).toBe(false);

    expect(
      verifyEmailSchema.safeParse({
        email: "user@example.com",
        otp: "abcdef",
      }).success,
    ).toBe(false);
  });
});
