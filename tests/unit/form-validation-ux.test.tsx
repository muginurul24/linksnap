import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { PasswordStrengthIndicator } from "../../src/components/auth/password-strength-indicator";
import {
  getPasswordStrength,
  getPasswordStrengthClassName,
} from "../../src/lib/auth/password-strength";
import {
  clearFieldError,
  fieldErrorFromParseResult,
  type FieldErrors,
} from "../../src/lib/forms/field-errors";
import { registerSchema } from "../../src/lib/validations/auth";
import { getCampaignFieldError } from "../../src/app/(dashboard)/campaigns/campaign-form";
import { getLinkFormFieldError } from "../../src/app/(dashboard)/links/link-form";

const validCampaign = {
  description: "",
  name: "Ramadhan Sale",
  slug: "ramadhan-sale",
  utmCampaign: "",
  utmContent: "",
  utmMedium: "",
  utmSource: "",
  utmTerm: "",
};

describe("form validation UX", () => {
  it("should classify password strength when users type new passwords", () => {
    expect(getPasswordStrength("")).toBeNull();
    expect(getPasswordStrength("password")).toBe("Weak");
    expect(getPasswordStrength("Password1")).toBe("Fair");
    expect(getPasswordStrength("Password1234!")).toBe("Strong");
    expect(getPasswordStrengthClassName("Weak")).toContain("destructive");
  });

  it("should render password strength copy when password is present", () => {
    const markup = renderToStaticMarkup(
      <PasswordStrengthIndicator password="Password1234!" />,
    );

    expect(markup).toContain("Password strength: Strong");
    expect(markup).toContain('aria-live="polite"');
  });

  it("should return field error when a blurred auth field is invalid", () => {
    const result = registerSchema.safeParse({
      confirmPassword: "Password1",
      email: "not-an-email",
      password: "Password1",
    });

    expect(fieldErrorFromParseResult(result, "email")).toBe(
      "Enter a valid email address",
    );
  });

  it("should clear field error when user starts typing in that field", () => {
    type LoginField = "email" | "password";
    const currentErrors: FieldErrors<LoginField> = {
      email: "Enter a valid email address",
      password: "Password is required",
    };

    const errors = clearFieldError<LoginField>(currentErrors, "email");

    expect(errors.email).toBeUndefined();
    expect(errors.password).toBe("Password is required");
  });

  it("should validate link URL with helpful message when destination is invalid", () => {
    expect(
      getLinkFormFieldError("destinationUrl", {
        destinationUrl: "not-a-url",
        slug: "promo-2026",
        title: "",
      }),
    ).toBe("Enter a valid URL");
  });

  it("should validate campaign slug format when slug has unsupported characters", () => {
    expect(
      getCampaignFieldError("slug", {
        ...validCampaign,
        slug: "Bad Slug",
      }),
    ).toBe("Slug must be 3-100 lowercase letters, numbers, or hyphens");
  });
});
