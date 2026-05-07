import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import {
  CreateLinkForm,
  getPlanGatedToggleState,
} from "../../src/app/(dashboard)/links/link-form";

describe("link form plan gates", () => {
  it("should disable Link Page and Smart Rules toggles for free users", () => {
    expect(
      getPlanGatedToggleState({
        feature: "LINK_PAGE",
        isSubmitting: false,
        userPlan: "FREE",
      }),
    ).toEqual({
      disabled: true,
      message: "Link Pages require Pro plan",
    });
    expect(
      getPlanGatedToggleState({
        feature: "SMART_RULES",
        isSubmitting: false,
        userPlan: "FREE",
      }),
    ).toEqual({
      disabled: true,
      message: "Smart Rules require Pro plan",
    });
  });

  it("should allow Link Page and Smart Rules toggles for paid users", () => {
    expect(
      getPlanGatedToggleState({
        feature: "LINK_PAGE",
        isSubmitting: false,
        userPlan: "PRO",
      }),
    ).toEqual({ disabled: false });
    expect(
      getPlanGatedToggleState({
        feature: "SMART_RULES",
        isSubmitting: false,
        userPlan: "BUSINESS",
      }),
    ).toEqual({ disabled: false });
  });

  it("should render free-user upgrade reasons in the link form", () => {
    const markup = renderToStaticMarkup(<CreateLinkForm userPlan="FREE" />);

    expect(markup).toContain("Link Pages require Pro plan");
    expect(markup).toContain("Smart Rules require Pro plan");
    expect(markup).toContain('title="Link Pages require Pro plan"');
    expect(markup).toContain('title="Smart Rules require Pro plan"');
  });

  it("should not render upgrade reasons for paid users", () => {
    const markup = renderToStaticMarkup(<CreateLinkForm userPlan="PRO" />);

    expect(markup).not.toContain("Link Pages require Pro plan");
    expect(markup).not.toContain("Smart Rules require Pro plan");
  });
});
