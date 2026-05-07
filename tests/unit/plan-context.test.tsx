import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanProvider, usePlan } from "../../src/lib/auth/plan-context";

function PlanReader() {
  return <span>{usePlan()}</span>;
}

describe("plan context", () => {
  it("should provide the current user plan", () => {
    const markup = renderToStaticMarkup(
      <PlanProvider userPlan="BUSINESS">
        <PlanReader />
      </PlanProvider>,
    );

    expect(markup).toContain("BUSINESS");
  });

  it("should require a PlanProvider", () => {
    expect(() => renderToStaticMarkup(<PlanReader />)).toThrow(
      "usePlan must be used within PlanProvider.",
    );
  });
});
