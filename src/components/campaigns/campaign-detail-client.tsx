"use client";

import { useState } from "react";
import {
  CampaignAnalyticsClient,
  type CampaignOption,
} from "@/components/campaigns/campaign-analytics-client";
import { CampaignLinksManager } from "@/components/campaigns/campaign-links-manager";

type CampaignDetailClientProps = {
  campaign: CampaignOption;
  comparisonCampaigns: CampaignOption[];
};

export function CampaignDetailClient({
  campaign,
  comparisonCampaigns,
}: CampaignDetailClientProps) {
  const [analyticsRefreshToken, setAnalyticsRefreshToken] = useState(0);

  return (
    <>
      <CampaignAnalyticsClient
        campaign={campaign}
        comparisonCampaigns={comparisonCampaigns}
        refreshToken={analyticsRefreshToken}
      />
      <CampaignLinksManager
        campaign={campaign}
        onLinksChanged={() => setAnalyticsRefreshToken((value) => value + 1)}
      />
    </>
  );
}
