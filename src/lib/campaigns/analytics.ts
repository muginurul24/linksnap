import {
  summarizeClickEvents,
  type AnalyticsDateRange,
  type LinkAnalyticsSummary,
} from "@/lib/analytics/summary";
import type { CampaignClickEventForAnalytics } from "@/lib/db/queries/click-events";

export function groupCampaignClickEvents(
  events: CampaignClickEventForAnalytics[],
): Map<string, CampaignClickEventForAnalytics[]> {
  const groups = new Map<string, CampaignClickEventForAnalytics[]>();

  for (const event of events) {
    const campaignEvents = groups.get(event.campaignId) ?? [];
    campaignEvents.push(event);
    groups.set(event.campaignId, campaignEvents);
  }

  return groups;
}

export function summarizeCampaignClickEvents({
  campaignIds,
  events,
  range,
}: {
  campaignIds: string[];
  events: CampaignClickEventForAnalytics[];
  range: AnalyticsDateRange;
}): Map<string, LinkAnalyticsSummary> {
  const eventsByCampaign = groupCampaignClickEvents(events);

  return new Map(
    campaignIds.map((campaignId) => [
      campaignId,
      summarizeClickEvents(eventsByCampaign.get(campaignId) ?? [], range),
    ]),
  );
}
