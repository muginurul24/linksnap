import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { encode } from "@auth/core/jwt";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { campaigns, clickEvents, links, users } from "../../src/lib/db/schema";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(120_000);

type CampaignAnalyticsTestUser = {
  email: string;
  id: string;
};

type SeededCampaignAnalytics = {
  compareCampaignName: string;
  compareCampaignSlug: string;
  primaryCampaignId: string;
  primaryCampaignName: string;
  topLinkSlug: string;
};

const baseURL =
  process.env.E2E_BASE_URL ??
  `http://localhost:${Number(process.env.E2E_PORT ?? 3100)}`;
const createdUserIds: string[] = [];

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required for E2E auth.");
  }

  return secret;
}

async function createCampaignAnalyticsUser(
  label: string,
): Promise<CampaignAnalyticsTestUser> {
  const email = `linksnap-e2e-campaign-${label}-${randomUUID()}@example.com`;
  const [created] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        name: "LinkSnap E2E Campaign User",
        plan: "PRO",
        role: "user",
      })
      .returning({ id: users.id }),
  );

  if (!created) throw new Error("Unable to create E2E campaign user.");

  createdUserIds.push(created.id);

  return { email, id: created.id };
}

async function cleanupCampaignAnalyticsUsers(): Promise<void> {
  for (const userId of createdUserIds.splice(0)) {
    await redis.del(`rate-limit:api:campaigns:analytics:get:${userId}`);
    await retryTransientDb(() => db.delete(users).where(eq(users.id, userId)));
  }
}

async function authenticateAs(
  page: Page,
  user: CampaignAnalyticsTestUser,
): Promise<void> {
  const maxAge = 30 * 24 * 60 * 60;
  const token = await encode({
    maxAge,
    salt: "authjs.session-token",
    secret: getAuthSecret(),
    token: {
      email: user.email,
      id: user.id,
      name: "LinkSnap E2E Campaign User",
      role: "user",
      sub: user.id,
    },
  });

  await page.context().addCookies([
    {
      expires: Math.floor(Date.now() / 1000) + maxAge,
      httpOnly: true,
      name: "authjs.session-token",
      sameSite: "Lax",
      secure: baseURL.startsWith("https://"),
      url: baseURL,
      value: token,
    },
  ]);
}

async function seedCampaignAnalyticsData(
  userId: string,
): Promise<SeededCampaignAnalytics> {
  const suffix = randomUUID().slice(0, 8);
  const primaryCampaignName = "Spring Launch E2E";
  const compareCampaignName = "Evergreen Compare E2E";
  const primaryCampaignSlug = `spring-launch-${suffix}`;
  const compareCampaignSlug = `evergreen-compare-${suffix}`;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [primaryCampaign, compareCampaign] = await retryTransientDb(() =>
    db
      .insert(campaigns)
      .values([
        {
          description: "Primary campaign analytics fixture.",
          name: primaryCampaignName,
          slug: primaryCampaignSlug,
          userId,
          utmCampaign: primaryCampaignSlug,
          utmMedium: "social",
          utmSource: "instagram",
        },
        {
          description: "Comparison campaign analytics fixture.",
          name: compareCampaignName,
          slug: compareCampaignSlug,
          userId,
          utmCampaign: compareCampaignSlug,
          utmMedium: "email",
          utmSource: "newsletter",
        },
      ])
      .returning({ id: campaigns.id, name: campaigns.name, slug: campaigns.slug }),
  );

  if (!primaryCampaign || !compareCampaign) {
    throw new Error("Unable to create campaign analytics fixtures.");
  }

  const topLinkSlug = `spring-offer-${suffix}`;
  const secondaryLinkSlug = `spring-docs-${suffix}`;
  const compareLinkSlug = `compare-offer-${suffix}`;
  const [topLink, secondaryLink, compareLink] = await retryTransientDb(() =>
    db
      .insert(links)
      .values([
        {
          campaignId: primaryCampaign.id,
          destinationUrl:
            "https://example.com/spring-offer?utm_source=instagram",
          hasLinkPage: true,
          slug: topLinkSlug,
          title: "Spring Offer",
          userId,
        },
        {
          campaignId: primaryCampaign.id,
          destinationUrl: "https://example.com/spring-docs",
          slug: secondaryLinkSlug,
          title: "Spring Docs",
          userId,
        },
        {
          campaignId: compareCampaign.id,
          destinationUrl: "https://example.com/compare-offer",
          slug: compareLinkSlug,
          title: "Compare Offer",
          userId,
        },
      ])
      .returning({ id: links.id, slug: links.slug }),
  );

  if (!topLink || !secondaryLink || !compareLink) {
    throw new Error("Unable to create campaign link fixtures.");
  }

  await retryTransientDb(() =>
    db.insert(clickEvents).values([
      {
        browser: "Chrome",
        city: "Jakarta",
        country: "Indonesia",
        device: "mobile",
        eventType: "DIRECT_REDIRECT",
        ipHash: "e2e-campaign-hash-a",
        linkId: topLink.id,
        referrer: "instagram.com",
        timestamp: now,
      },
      {
        browser: "Safari",
        city: "Bandung",
        country: "Indonesia",
        device: "desktop",
        eventType: "LINK_PAGE_VIEW",
        ipHash: "e2e-campaign-hash-b",
        linkId: topLink.id,
        linkPageHasCountdown: true,
        referrer: "newsletter.example.com",
        timestamp: now,
      },
      {
        browser: "Safari",
        city: "Bandung",
        country: "Indonesia",
        device: "desktop",
        eventType: "LINK_PAGE_CTA_CLICK",
        ipHash: "e2e-campaign-hash-b",
        linkId: topLink.id,
        linkPageHasCountdown: true,
        referrer: "newsletter.example.com",
        timestamp: now,
      },
      {
        browser: "Firefox",
        city: "Surabaya",
        country: "Indonesia",
        device: "tablet",
        eventType: "DIRECT_REDIRECT",
        ipHash: "e2e-campaign-hash-c",
        linkId: secondaryLink.id,
        referrer: "Direct",
        timestamp: yesterday,
      },
      {
        browser: "Chrome",
        city: "Singapore",
        country: "Singapore",
        device: "desktop",
        eventType: "DIRECT_REDIRECT",
        ipHash: "e2e-campaign-hash-d",
        linkId: compareLink.id,
        referrer: "newsletter.example.com",
        timestamp: now,
      },
    ]),
  );

  return {
    compareCampaignName: compareCampaign.name,
    compareCampaignSlug: compareCampaign.slug,
    primaryCampaignId: primaryCampaign.id,
    primaryCampaignName: primaryCampaign.name,
    topLinkSlug: topLink.slug,
  };
}

async function createEmptyCampaign(userId: string): Promise<{
  id: string;
  name: string;
}> {
  const suffix = randomUUID().slice(0, 8);
  const [campaign] = await retryTransientDb(() =>
    db
      .insert(campaigns)
      .values({
        description: "Empty campaign analytics fixture.",
        name: "Empty Campaign E2E",
        slug: `empty-campaign-${suffix}`,
        userId,
      })
      .returning({ id: campaigns.id, name: campaigns.name }),
  );

  if (!campaign) throw new Error("Unable to create empty campaign fixture.");

  return campaign;
}

test.afterEach(async () => {
  await cleanupCampaignAnalyticsUsers();
});

test.describe("Campaign detail analytics page", () => {
  test("renders campaign KPIs, charts, comparison, top links, and CSV export", async ({
    page,
  }) => {
    const user = await createCampaignAnalyticsUser("data");
    const seeded = await seedCampaignAnalyticsData(user.id);

    await authenticateAs(page, user);

    const analyticsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(
          `/api/v1/campaigns/${seeded.primaryCampaignId}/analytics`,
        ) && response.request().method() === "GET",
    );
    await page.goto(`/campaigns/${seeded.primaryCampaignId}`);
    expect((await analyticsResponsePromise).ok()).toBe(true);

    await expect(
      page.getByRole("heading", { name: seeded.primaryCampaignName }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("campaign-analytics-dashboard")).toBeVisible();
    await expect(page.getByTestId("campaign-kpi-total-clicks")).toContainText("3");
    await expect(page.getByTestId("campaign-kpi-unique-visitors")).toContainText(
      "3",
    );
    await expect(page.getByTestId("campaign-kpi-links")).toContainText("2");
    await expect(page.getByTestId("campaign-kpi-ctr")).toContainText("100%");
    const dashboard = page.getByTestId("campaign-analytics-dashboard");
    await expect(dashboard.getByText("Click Trend", { exact: true })).toBeVisible();
    await expect(
      dashboard.getByText("Link Page Funnel", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByText("Device Breakdown", { exact: true }),
    ).toBeVisible();
    await expect(dashboard.getByText("Geo Breakdown", { exact: true })).toBeVisible();
    await expect(dashboard.getByText("Top Links", { exact: true })).toBeVisible();
    await expect(dashboard.getByText(`/${seeded.topLinkSlug}`)).toBeVisible();

    await page
      .getByRole("checkbox", { name: new RegExp(seeded.compareCampaignName) })
      .check();
    await expect(page.getByText("Comparison Snapshot")).toBeVisible();
    await expect(
      dashboard.getByText(seeded.compareCampaignName, { exact: true }),
    ).toBeVisible();

    const exportLink = page.getByTestId("campaign-export-csv");
    await expect(exportLink).toHaveAttribute(
      "download",
      new RegExp(`linksnap-campaign-.+\\.csv`),
    );
    await expect(exportLink).toHaveAttribute("href", /^data:text\/csv/);

    await page.getByRole("button", { name: "30D" }).click();
    await expect(page.getByTestId("campaign-analytics-dashboard")).toBeVisible();
  });

  test("shows a friendly empty state and keeps CSV export disabled", async ({
    page,
  }) => {
    const user = await createCampaignAnalyticsUser("empty");
    const campaign = await createEmptyCampaign(user.id);

    await authenticateAs(page, user);
    await page.goto(`/campaigns/${campaign.id}`);

    await expect(
      page.getByRole("heading", { name: campaign.name }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("heading", { name: "No clicks yet for this campaign." }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    await expect(page.getByText("No clicks in this range")).toBeVisible();
    await expect(page.getByText("No top links yet")).toBeVisible();
  });

  test("keeps campaign analytics usable on mobile without page overflow", async ({
    page,
  }) => {
    const user = await createCampaignAnalyticsUser("mobile");
    const seeded = await seedCampaignAnalyticsData(user.id);

    await page.setViewportSize({ height: 844, width: 390 });
    await authenticateAs(page, user);
    await page.goto(`/campaigns/${seeded.primaryCampaignId}`);

    await expect(
      page.getByRole("group", { name: "Campaign analytics date range" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Top Links")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
