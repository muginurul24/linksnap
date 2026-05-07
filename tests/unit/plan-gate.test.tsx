import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanGate } from "../../src/components/plan-gate";

describe("PlanGate", () => {
  it("should render children normally when allowed", () => {
    const markup = renderToStaticMarkup(
      <PlanGate
        allowed
        upgradeMessage="Custom slugs require Pro or Business plan"
        upgradeUrl="/settings/billing?upgrade=custom-slug"
      >
        <input name="slug" />
      </PlanGate>,
    );

    expect(markup).toContain('name="slug"');
    expect(markup).not.toContain("Plan upgrade required");
    expect(markup).not.toContain("Custom slugs require Pro or Business plan");
    expect(markup).not.toContain("disabled");
  });

  it("should show upgrade gate and disable controls when not allowed", () => {
    const markup = renderToStaticMarkup(
      <PlanGate
        allowed={false}
        upgradeMessage="Custom slugs require Pro or Business plan"
        upgradeUrl="/settings/billing?upgrade=custom-slug"
      >
        <input name="slug" />
      </PlanGate>,
    );

    expect(markup).toContain("Plan upgrade required");
    expect(markup).toContain("Custom slugs require Pro or Business plan");
    expect(markup).toContain('href="/settings/billing?upgrade=custom-slug"');
    expect(markup).toContain('name="slug"');
    expect(markup).toContain("disabled");
    expect(markup).toContain('data-plan-gate-state="locked"');
  });

  it("should render quota children normally when quota remains", () => {
    const markup = renderToStaticMarkup(
      <PlanGate.Quota
        used={2}
        limit={3}
        upgradeMessage="Link Page quota reached"
        upgradeUrl="/settings/billing"
      >
        <button type="button">Enable Link Page</button>
      </PlanGate.Quota>,
    );

    expect(markup).toContain("Enable Link Page");
    expect(markup).not.toContain("Quota:");
    expect(markup).not.toContain("Link Page quota reached");
    expect(markup).not.toContain("disabled");
  });

  it("should show quota usage when quota is exhausted", () => {
    const markup = renderToStaticMarkup(
      <PlanGate.Quota
        used={3}
        limit={3}
        upgradeMessage="Link Page quota reached"
        upgradeUrl="/settings/billing"
      >
        <button type="button">Enable Link Page</button>
      </PlanGate.Quota>,
    );

    expect(markup).toContain("Link Page quota reached");
    expect(markup).toContain("Quota: 3/3");
    expect(markup).toContain("Enable Link Page");
    expect(markup).toContain("disabled");
  });
});
