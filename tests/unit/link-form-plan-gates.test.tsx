import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import {
  CreateLinkForm,
  type EditableLinkInitialData,
  getPlanGatedToggleState,
} from "../../src/app/(dashboard)/links/link-form";
import { PlanProvider } from "../../src/lib/auth/plan-context";
import type { UserPlan } from "../../src/lib/links/limits";

const initialLinkWithPage: EditableLinkInitialData = {
  destinationUrl: "https://example.com",
  hasLinkPage: true,
  id: "link-1",
  linkPage: {
    brandName: "Acme",
    ctaColor: "#111827",
    ctaText: "Open",
    description: "Existing page",
    title: "Existing Link Page",
  },
  slug: "existing",
  smartRules: [],
  title: "Existing",
};

function renderForm(
  element: ReactElement,
  userPlan: UserPlan,
): string {
  return renderToStaticMarkup(
    <PlanProvider userPlan={userPlan}>{element}</PlanProvider>,
  );
}

describe("link form plan gates", () => {
  it("should disable Link Page and allow Smart Rules toggles for free users", () => {
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
    ).toEqual({ disabled: false });
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
    const markup = renderForm(<CreateLinkForm />, "FREE");

    expect(markup).toContain("Custom slugs require Pro or Business plan.");
    expect(markup).toContain("Link Pages require Pro or Business plan.");
    expect(markup).not.toContain("Smart Rules require Pro or Business plan.");
    expect(markup).toContain("Enable Smart Rules");
    expect(markup).not.toContain("/settings/billing?upgrade=smart-rules");
    expect(markup).toContain('data-plan-gate-state="locked"');
  });

  it("should not render upgrade reasons for paid users", () => {
    const markup = renderForm(<CreateLinkForm />, "PRO");

    expect(markup).not.toContain("Custom slugs require Pro or Business plan.");
    expect(markup).not.toContain("Link Pages require Pro or Business plan.");
    expect(markup).not.toContain("Smart Rules require Pro or Business plan.");
  });

  it("should show Link Page quota gate for paid users at quota", () => {
    const markup = renderToStaticMarkup(
      <PlanProvider userPlan="PRO">
        <CreateLinkForm linkPageCount={50} />
      </PlanProvider>,
    );

    expect(markup).toContain("Link Page quota reached");
    expect(markup).toContain("Quota: 50/50");
    expect(markup).toContain("Enable Link Page");
  });

  it("should allow editing an existing Link Page at quota", () => {
    const markup = renderToStaticMarkup(
      <PlanProvider userPlan="PRO">
        <CreateLinkForm
          initialLink={initialLinkWithPage}
          linkPageCount={50}
        />
      </PlanProvider>,
    );

    expect(markup).not.toContain("Link Page quota reached");
    expect(markup).toContain("Existing Link Page");
  });
});
