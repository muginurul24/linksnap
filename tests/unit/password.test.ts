import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
} from "../../src/lib/auth/password";

describe("password helpers", () => {
  it("should hash password when storing credentials", async () => {
    const passwordHash = await hashPassword("Password1");

    expect(passwordHash).not.toBe("Password1");
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
  });

  it("should verify password when hash matches stored credentials", async () => {
    const passwordHash = await hashPassword("Password1");

    await expect(verifyPassword("Password1", passwordHash)).resolves.toBe(true);
    await expect(verifyPassword("WrongPassword1", passwordHash)).resolves.toBe(
      false,
    );
  });
});
