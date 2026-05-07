import { describe, expect, it } from "vitest";
import {
  appendCampaignUtmParams,
  buildCampaignUtmParams,
  hasUtmParams,
  previewCampaignUtmUrls,
} from "../../src/lib/campaigns/utm-builder";

describe("campaign UTM builder", () => {
  it("should append campaign UTM params when destination has no UTM params", () => {
    const params = buildCampaignUtmParams({
      utmCampaign: "ramadhan-2026",
      utmContent: "hero",
      utmMedium: "social",
      utmSource: "instagram",
      utmTerm: null,
    });

    expect(appendCampaignUtmParams("https://example.com/product?sku=1", params)).toEqual({
      destinationUrl: "https://example.com/product?sku=1",
      previewUrl:
        "https://example.com/product?sku=1&utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026&utm_content=hero",
      utmApplied: true,
    });
  });

  it("should skip appending campaign UTM params when destination already has UTM params", () => {
    const params = buildCampaignUtmParams({
      utmCampaign: "ramadhan-2026",
      utmContent: null,
      utmMedium: "social",
      utmSource: "instagram",
      utmTerm: null,
    });

    expect(hasUtmParams("https://example.com/product?utm_source=newsletter")).toBe(
      true,
    );
    expect(
      appendCampaignUtmParams(
        "https://example.com/product?utm_source=newsletter",
        params,
      ),
    ).toEqual({
      destinationUrl: "https://example.com/product?utm_source=newsletter",
      previewUrl: "https://example.com/product?utm_source=newsletter",
      skippedReason: "existing_utm",
      utmApplied: false,
    });
  });

  it("should preview campaign UTM URLs before saving", () => {
    const previews = previewCampaignUtmUrls({
      links: [
        { destinationUrl: "https://example.com/one", id: "link-1" },
        {
          destinationUrl: "https://example.com/two?utm_campaign=manual",
          id: "link-2",
        },
      ],
      params: {
        utmCampaign: "ramadhan-2026",
        utmMedium: "social",
        utmSource: "instagram",
      },
    });

    expect(previews).toEqual([
      {
        destinationUrl: "https://example.com/one",
        id: "link-1",
        previewUrl:
          "https://example.com/one?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026",
        utmApplied: true,
      },
      {
        destinationUrl: "https://example.com/two?utm_campaign=manual",
        id: "link-2",
        previewUrl: "https://example.com/two?utm_campaign=manual",
        skippedReason: "existing_utm",
        utmApplied: false,
      },
    ]);
  });
});
