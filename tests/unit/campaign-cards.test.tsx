import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CampaignPerformanceSummary } from "../../src/components/campaigns/campaign-performance-summary";
import { CampaignSparkline } from "../../src/components/campaigns/campaign-sparkline";
import {
  sortCampaignCardMetrics,
  type CampaignCardMetrics,
} from "../../src/lib/db/queries/campaigns";

function campaign(
  overrides: Partial<CampaignCardMetrics> & Pick<CampaignCardMetrics, "id" | "name">,
): CampaignCardMetrics {
  const { id, name, ...rest } = overrides;

  return {
    clickTrend: [
      { date: "2026-05-03", totalClicks: 0 },
      { date: "2026-05-04", totalClicks: 0 },
      { date: "2026-05-05", totalClicks: 0 },
      { date: "2026-05-06", totalClicks: 0 },
      { date: "2026-05-07", totalClicks: 0 },
      { date: "2026-05-08", totalClicks: 0 },
      { date: "2026-05-09", totalClicks: 0 },
    ],
    clicksLast7Days: 0,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    description: null,
    id,
    linkCount: 0,
    name,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    totalClicks: 0,
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    userId: "user-1",
    utmCampaign: null,
    utmContent: null,
    utmMedium: null,
    utmSource: null,
    utmTerm: null,
    ...rest,
  };
}

describe("campaign cards", () => {
  it("should sort campaign cards by newest, clicks, and links", () => {
    const newest = campaign({
      createdAt: new Date("2026-05-09T00:00:00Z"),
      id: "campaign-newest",
      linkCount: 1,
      name: "Newest",
      totalClicks: 5,
    });
    const mostClicks = campaign({
      createdAt: new Date("2026-05-08T00:00:00Z"),
      id: "campaign-clicks",
      linkCount: 2,
      name: "Most Clicks",
      totalClicks: 30,
    });
    const mostLinks = campaign({
      createdAt: new Date("2026-05-07T00:00:00Z"),
      id: "campaign-links",
      linkCount: 8,
      name: "Most Links",
      totalClicks: 10,
    });

    expect(sortCampaignCardMetrics([mostLinks, mostClicks, newest], "newest")).toEqual([
      newest,
      mostClicks,
      mostLinks,
    ]);
    expect(
      sortCampaignCardMetrics([mostLinks, mostClicks, newest], "most-clicks")[0],
    ).toBe(mostClicks);
    expect(
      sortCampaignCardMetrics([mostClicks, newest, mostLinks], "most-links")[0],
    ).toBe(mostLinks);
  });

  it("should render mini performance metrics with real counts", () => {
    const markup = renderToStaticMarkup(
      <CampaignPerformanceSummary
        clicksLast7Days={99}
        linkCount={12}
        totalClicks={1234}
      />,
    );

    expect(markup).toContain("Total Clicks");
    expect(markup).toContain("1,234");
    expect(markup).toContain("Links");
    expect(markup).toContain("12");
    expect(markup).toContain("7-Day Clicks");
    expect(markup).toContain("99");
  });

  it("should render sparkline and empty sparkline states", () => {
    const sparklineMarkup = renderToStaticMarkup(
      <CampaignSparkline
        data={[
          { date: "2026-05-03", totalClicks: 1 },
          { date: "2026-05-04", totalClicks: 4 },
          { date: "2026-05-05", totalClicks: 2 },
        ]}
      />,
    );
    const emptyMarkup = renderToStaticMarkup(
      <CampaignSparkline
        data={[
          { date: "2026-05-03", totalClicks: 0 },
          { date: "2026-05-04", totalClicks: 0 },
        ]}
      />,
    );

    expect(sparklineMarkup).toContain("campaign-sparkline");
    expect(emptyMarkup).toContain("No activity");
  });
});
