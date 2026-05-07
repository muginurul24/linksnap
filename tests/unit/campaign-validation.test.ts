import { describe, expect, it } from "vitest";
import {
  addCampaignLinksSchema,
  campaignAnalyticsQuerySchema,
  campaignIdParamsSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
  removeCampaignLinkSchema,
  updateCampaignSchema,
} from "../../src/lib/validations/campaign";

describe("campaign validation", () => {
  it("should accept valid campaign creation input", () => {
    const parsed = createCampaignSchema.safeParse({
      description: "Ramadhan campaign",
      name: "Ramadhan Sale",
      slug: "ramadhan-sale",
      utmCampaign: "ramadhan-2026",
      utmContent: "",
      utmMedium: "social",
      utmSource: "instagram",
      utmTerm: "",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toMatchObject({
      description: "Ramadhan campaign",
      slug: "ramadhan-sale",
      utmContent: null,
      utmTerm: null,
    });
  });

  it("should reject invalid campaign names and slugs", () => {
    expect(
      createCampaignSchema.safeParse({
        name: "",
        slug: "ab",
      }).success,
    ).toBe(false);

    expect(
      createCampaignSchema.safeParse({
        name: "Campaign",
        slug: "Bad Slug",
      }).success,
    ).toBe(false);
  });

  it("should require at least one update field", () => {
    expect(updateCampaignSchema.safeParse({}).success).toBe(false);
    expect(
      updateCampaignSchema.safeParse({ description: "", name: "Updated" }).success,
    ).toBe(true);
  });

  it("should validate list query and params", () => {
    expect(
      listCampaignsQuerySchema.safeParse({
        limit: "10",
        page: "2",
        search: "promo",
      }).success,
    ).toBe(true);
    expect(listCampaignsQuerySchema.safeParse({ limit: "101" }).success).toBe(
      false,
    );
    expect(
      campaignIdParamsSchema.safeParse({
        id: "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0",
      }).success,
    ).toBe(true);
  });

  it("should validate campaign link assignment inputs", () => {
    const linkId = "f4bd85a6-2e8c-47fc-894d-3dbe3c7d86b0";
    const parsed = addCampaignLinksSchema.safeParse({
      linkIds: [linkId, linkId],
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.linkIds).toEqual([linkId]);
    expect(removeCampaignLinkSchema.safeParse({ linkId }).success).toBe(true);
    expect(addCampaignLinksSchema.safeParse({ linkIds: [] }).success).toBe(
      false,
    );
  });

  it("should validate campaign analytics query inputs", () => {
    const parsed = campaignAnalyticsQuerySchema.safeParse({
      compare: "launch-q2-2026,ramadhan-sale,launch-q2-2026",
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-06T00:00:00.000Z",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.compare).toEqual(["launch-q2-2026", "ramadhan-sale"]);
    expect(parsed.data.from).toEqual(new Date("2026-05-01T00:00:00.000Z"));
    expect(parsed.data.to).toEqual(new Date("2026-05-06T00:00:00.000Z"));
    expect(
      campaignAnalyticsQuerySchema.safeParse({ compare: "Bad Slug" }).success,
    ).toBe(false);
  });
});
