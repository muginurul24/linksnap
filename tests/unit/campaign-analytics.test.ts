import { describe, expect, it } from "vitest";
import type { AnalyticsDateRange } from "../../src/lib/analytics/summary";
import { summarizeCampaignClickEvents } from "../../src/lib/campaigns/analytics";
import type { CampaignClickEventForAnalytics } from "../../src/lib/db/queries/click-events";

const campaignId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
const compareCampaignId = "597c9f2a-6206-409e-a116-5d02bba5f7a4";

function createClickEvent(
  overrides: Partial<CampaignClickEventForAnalytics> = {},
): CampaignClickEventForAnalytics {
  return {
    browser: "Chrome",
    campaignId,
    city: "Jakarta",
    country: "ID",
    device: "desktop",
    eventType: "DIRECT_REDIRECT",
    ipHash: "hash-1",
    linkPageHasCountdown: false,
    referrer: "https://referrer.example",
    timestamp: new Date("2026-05-06T10:00:00.000Z"),
    ...overrides,
  };
}

describe("campaign analytics", () => {
  it("should summarize campaign clicks independently when multiple campaigns are present", () => {
    const range: AnalyticsDateRange = {
      from: new Date("2026-05-05T00:00:00.000Z"),
      to: new Date("2026-05-06T23:59:59.000Z"),
    };
    const summaries = summarizeCampaignClickEvents({
      campaignIds: [campaignId, compareCampaignId],
      events: [
        createClickEvent(),
        createClickEvent({
          device: "mobile",
          ipHash: "hash-2",
          timestamp: new Date("2026-05-05T10:00:00.000Z"),
        }),
        createClickEvent({
          campaignId: compareCampaignId,
          country: "SG",
          ipHash: "hash-3",
        }),
        createClickEvent({
          campaignId: compareCampaignId,
          eventType: "LINK_PAGE_CTA_CLICK",
          ipHash: "hash-4",
        }),
      ],
      range,
    });

    expect(summaries.get(campaignId)).toMatchObject({
      clicksPerDay: [
        { date: "2026-05-05", totalClicks: 1 },
        { date: "2026-05-06", totalClicks: 1 },
      ],
      deviceBreakdown: [
        { count: 1, label: "desktop" },
        { count: 1, label: "mobile" },
      ],
      totalClicks: 2,
      uniqueClicks: 2,
    });
    expect(summaries.get(compareCampaignId)).toMatchObject({
      linkPageAnalytics: {
        ctaClicks: 1,
      },
      topCountries: [{ count: 1, label: "SG" }],
      totalClicks: 1,
      uniqueClicks: 1,
    });
  });
});
