import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "../../src/components/dashboard/empty-state";
import { analyticsEmptyState } from "../../src/lib/analytics/empty-state";

describe("analytics empty state", () => {
  it("should render helpful copy and a links CTA", () => {
    const markup = renderToStaticMarkup(
      <EmptyState
        actionHref={analyticsEmptyState.actionHref}
        actionLabel={analyticsEmptyState.actionLabel}
        description={analyticsEmptyState.description}
        icon={<span />}
        title={analyticsEmptyState.title}
      />,
    );

    expect(markup).toContain(
      "No click data yet. Share your links to start seeing analytics.",
    );
    expect(markup).toContain("Copy a link");
    expect(markup).toContain('href="/links"');
  });
});
