type CampaignUtmSource = {
  utmCampaign: string | null;
  utmContent: string | null;
  utmMedium: string | null;
  utmSource: string | null;
  utmTerm: string | null;
};

export type CampaignUtmParams = {
  utmCampaign?: string;
  utmContent?: string;
  utmMedium?: string;
  utmSource?: string;
  utmTerm?: string;
};

export type CampaignUtmPreviewLink = {
  destinationUrl: string;
  id: string;
};

export type CampaignUtmPreview = {
  destinationUrl: string;
  id: string;
  previewUrl: string;
  skippedReason?: "existing_utm" | "no_utm_params";
  utmApplied: boolean;
};

export type CampaignUtmUrlPreview = Omit<CampaignUtmPreview, "id">;

const UTM_KEY_MAP: Array<[keyof CampaignUtmParams, string]> = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
];

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

export function buildCampaignUtmParams(
  campaign: CampaignUtmSource,
): CampaignUtmParams {
  return {
    ...(hasValue(campaign.utmSource) ? { utmSource: campaign.utmSource } : {}),
    ...(hasValue(campaign.utmMedium) ? { utmMedium: campaign.utmMedium } : {}),
    ...(hasValue(campaign.utmCampaign) ? { utmCampaign: campaign.utmCampaign } : {}),
    ...(hasValue(campaign.utmTerm) ? { utmTerm: campaign.utmTerm } : {}),
    ...(hasValue(campaign.utmContent) ? { utmContent: campaign.utmContent } : {}),
  };
}

export function hasUtmParams(destinationUrl: string): boolean {
  const url = new URL(destinationUrl);

  return [...url.searchParams.keys()].some((key) =>
    key.toLowerCase().startsWith("utm_"),
  );
}

function hasAnyUtmParam(params: CampaignUtmParams): boolean {
  return Object.values(params).some((value) => hasValue(value));
}

export function appendCampaignUtmParams(
  destinationUrl: string,
  params: CampaignUtmParams,
): CampaignUtmUrlPreview {
  if (!hasAnyUtmParam(params)) {
    return {
      destinationUrl,
      previewUrl: destinationUrl,
      skippedReason: "no_utm_params",
      utmApplied: false,
    };
  }

  const url = new URL(destinationUrl);
  if (hasUtmParams(destinationUrl)) {
    return {
      destinationUrl,
      previewUrl: url.toString(),
      skippedReason: "existing_utm",
      utmApplied: false,
    };
  }

  for (const [sourceKey, queryKey] of UTM_KEY_MAP) {
    const value = params[sourceKey];
    if (hasValue(value)) url.searchParams.set(queryKey, value);
  }

  return {
    destinationUrl,
    previewUrl: url.toString(),
    utmApplied: true,
  };
}

export function previewCampaignUtmUrls({
  links,
  params,
}: {
  links: CampaignUtmPreviewLink[];
  params: CampaignUtmParams;
}): CampaignUtmPreview[] {
  return links.map((link) => ({
    ...appendCampaignUtmParams(link.destinationUrl, params),
    id: link.id,
  }));
}
