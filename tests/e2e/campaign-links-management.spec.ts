import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { encode } from "@auth/core/jwt";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { campaigns, links, users } from "../../src/lib/db/schema";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(120_000);

type TestUser = {
  email: string;
  id: string;
};

type CampaignLinksFixture = {
  campaignId: string;
  campaignName: string;
  existingSlug: string;
  unassignedSlug: string;
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

async function createUser(label: string): Promise<TestUser> {
  const email = `linksnap-e2e-campaign-links-${label}-${randomUUID()}@example.com`;
  const [created] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        name: "LinkSnap E2E Campaign Links User",
        plan: "PRO",
        role: "user",
      })
      .returning({ id: users.id }),
  );

  if (!created) throw new Error("Unable to create E2E user.");

  createdUserIds.push(created.id);
  return { email, id: created.id };
}

async function cleanupUsers(): Promise<void> {
  for (const userId of createdUserIds.splice(0)) {
    await redis.del(
      `rate-limit:api:campaigns:links:get:${userId}`,
      `rate-limit:api:campaigns:links:post:${userId}`,
      `rate-limit:api:campaigns:links:delete:${userId}`,
      `rate-limit:api:links:list:${userId}`,
    );
    await retryTransientDb(() => db.delete(users).where(eq(users.id, userId)));
  }
}

async function authenticateAs(page: Page, user: TestUser): Promise<void> {
  const maxAge = 30 * 24 * 60 * 60;
  const token = await encode({
    maxAge,
    salt: "authjs.session-token",
    secret: getAuthSecret(),
    token: {
      email: user.email,
      id: user.id,
      name: "LinkSnap E2E Campaign Links User",
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

async function seedCampaignLinks(userId: string): Promise<CampaignLinksFixture> {
  const suffix = randomUUID().slice(0, 8);
  const campaignName = "Campaign Links E2E";
  const [campaign] = await retryTransientDb(() =>
    db
      .insert(campaigns)
      .values({
        name: campaignName,
        slug: `campaign-links-${suffix}`,
        userId,
        utmCampaign: `campaign-links-${suffix}`,
        utmMedium: "social",
        utmSource: "instagram",
      })
      .returning({ id: campaigns.id, name: campaigns.name }),
  );

  if (!campaign) throw new Error("Unable to create campaign fixture.");

  const existingSlug = `attached-${suffix}`;
  const unassignedSlug = `unassigned-${suffix}`;

  await retryTransientDb(() =>
    db.insert(links).values([
      {
        campaignId: campaign.id,
        destinationUrl: "https://example.com/attached",
        slug: existingSlug,
        title: "Attached Link",
        userId,
      },
      {
        destinationUrl: "https://example.com/unassigned",
        slug: unassignedSlug,
        title: "Unassigned Link",
        userId,
      },
    ]),
  );

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    existingSlug,
    unassignedSlug,
  };
}

test.afterEach(async () => {
  await cleanupUsers();
});

test.describe("Campaign links management", () => {
  test("adds, previews, searches, and removes campaign links", async ({ page }) => {
    const user = await createUser("manage");
    const fixture = await seedCampaignLinks(user.id);

    await authenticateAs(page, user);
    await page.goto(`/campaigns/${fixture.campaignId}`);

    const linksManager = page.getByTestId("campaign-links-manager");

    await expect(linksManager.getByText("Campaign Links")).toBeVisible({
      timeout: 20_000,
    });
    await expect(linksManager.getByText(`/${fixture.existingSlug}`)).toBeVisible({
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Add Links" }).click();
    await expect(page.getByRole("dialog", { name: "Add links to campaign" })).toBeVisible();
    await page.getByPlaceholder("Search uncampaigned links").fill(fixture.unassignedSlug);
    await expect(
      page.getByRole("checkbox", { name: new RegExp(fixture.unassignedSlug) }),
    ).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole("checkbox", { name: new RegExp(fixture.unassignedSlug) })
      .check();
    await expect(page.getByText("UTM applied")).toBeVisible();
    await expect(page.getByText(/utm_campaign=/)).toBeVisible();

    const addResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/campaigns/${fixture.campaignId}/links`) &&
        response.request().method() === "POST" &&
        response.ok(),
    );
    await page.getByRole("button", { name: "Add to Campaign" }).click();
    await addResponsePromise;
    await expect(page.getByRole("dialog", { name: "Add links to campaign" })).toBeHidden();
    await expect(linksManager.getByText(`/${fixture.unassignedSlug}`)).toBeVisible();

    await page
      .getByRole("button", {
        name: `Remove ${fixture.unassignedSlug} from campaign`,
      })
      .click();
    await expect(
      page.getByText(
        `Are you sure you want to delete /${fixture.unassignedSlug} from ${fixture.campaignName}?`,
      ),
    ).toBeVisible();

    const removeResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/campaigns/${fixture.campaignId}/links`) &&
        response.request().method() === "DELETE" &&
        response.ok(),
    );
    await page.getByRole("button", { name: "Delete" }).click();
    await removeResponsePromise;
    await expect(linksManager.getByText(`/${fixture.unassignedSlug}`)).toBeHidden();
  });
});
