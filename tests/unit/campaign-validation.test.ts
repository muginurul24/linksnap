import { describe, expect, it } from "vitest";
import {
  campaignIdParamsSchema,
  createCampaignSchema,
  listCampaignsQuerySchema,
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
});
