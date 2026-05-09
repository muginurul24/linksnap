import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  formatCtr,
  LinkPagePerformanceSummary,
} from "../../src/components/link-pages/link-page-performance-summary";
import { LinkPageSparkline } from "../../src/components/link-pages/link-page-sparkline";

describe("link pages list", () => {
  it("should render page performance metrics and CTR labels", () => {
    const markup = renderToStaticMarkup(
      <LinkPagePerformanceSummary
        ctaClicks={25}
        pageViews={100}
        pageViewsLast7Days={40}
      />,
    );

    expect(markup).toContain("Page Views");
    expect(markup).toContain("100");
    expect(markup).toContain("CTA Clicks");
    expect(markup).toContain("25");
    expect(markup).toContain("7-Day Views");
    expect(markup).toContain("40");
    expect(formatCtr(0.125)).toBe("12.5%");
  });

  it("should render page-view sparkline and empty sparkline states", () => {
    const sparklineMarkup = renderToStaticMarkup(
      <LinkPageSparkline
        data={[
          { date: "2026-05-03", pageViews: 3 },
          { date: "2026-05-04", pageViews: 7 },
        ]}
      />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <LinkPageSparkline
        data={[
          { date: "2026-05-03", pageViews: 0 },
          { date: "2026-05-04", pageViews: 0 },
        ]}
      />,
    );

    expect(sparklineMarkup).toContain("link-page-sparkline");
    expect(emptyMarkup).toContain("No views");
  });
});
