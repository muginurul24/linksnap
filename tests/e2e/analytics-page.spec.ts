import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { encode } from "@auth/core/jwt";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { clickEvents, links, users } from "../../src/lib/db/schema";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(90_000);

type AnalyticsTestUser = {
  email: string;
  id: string;
};

const createdUserIds: string[] = [];

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required for E2E auth.");
  }

  return secret;
}

async function createAnalyticsUser(label: string): Promise<AnalyticsTestUser> {
  const email = `linksnap-e2e-analytics-${label}-${randomUUID()}@example.com`;
  const [created] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        name: "LinkSnap E2E Analytics User",
        plan: "PRO",
        role: "user",
      })
      .returning({ id: users.id }),
  );

  createdUserIds.push(created.id);

  return { email, id: created.id };
}

async function cleanupAnalyticsUsers(): Promise<void> {
  for (const userId of createdUserIds.splice(0)) {
    await retryTransientDb(() => db.delete(users).where(eq(users.id, userId)));
  }
}

async function authenticateAs(page: Page, user: AnalyticsTestUser): Promise<void> {
  const maxAge = 30 * 24 * 60 * 60;
  const token = await encode({
    maxAge,
    salt: "authjs.session-token",
    secret: getAuthSecret(),
    token: {
      email: user.email,
      id: user.id,
      name: "LinkSnap E2E Analytics User",
      role: "user",
      sub: user.id,
    },
  });

  await page.context().addCookies([
    {
      domain: "localhost",
      expires: Math.floor(Date.now() / 1000) + maxAge,
      httpOnly: true,
      name: "authjs.session-token",
      path: "/",
      sameSite: "Lax",
      secure: false,
      value: token,
    },
  ]);
}

async function seedAnalyticsData(userId: string): Promise<{
  docsSlug: string;
  landingSlug: string;
}> {
  const suffix = randomUUID().slice(0, 8);
  const landingSlug = `e2e-landing-${suffix}`;
  const docsSlug = `e2e-docs-${suffix}`;
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [landing, docs] = await retryTransientDb(() =>
    db
      .insert(links)
      .values([
        {
          destinationUrl: "https://example.com/landing",
          hasLinkPage: true,
          slug: landingSlug,
          title: "Landing Campaign",
          userId,
        },
        {
          destinationUrl: "https://example.com/docs",
          hasLinkPage: false,
          slug: docsSlug,
          title: "Docs Campaign",
          userId,
        },
      ])
      .returning({ id: links.id, slug: links.slug }),
  );

  await retryTransientDb(() =>
    db.insert(clickEvents).values([
      {
        browser: "Chrome",
        city: "New York",
        country: "United States",
        device: "desktop",
        eventType: "DIRECT_REDIRECT",
        ipHash: "e2e-hash-a",
        linkId: landing.id,
        referrer: "google.com",
        timestamp: now,
      },
      {
        browser: "Safari",
        city: "San Francisco",
        country: "United States",
        device: "mobile",
        eventType: "LINK_PAGE_VIEW",
        ipHash: "e2e-hash-b",
        linkId: landing.id,
        linkPageHasCountdown: true,
        referrer: "twitter.com",
        timestamp: now,
      },
      {
        browser: "Safari",
        city: "San Francisco",
        country: "United States",
        device: "mobile",
        eventType: "LINK_PAGE_CTA_CLICK",
        ipHash: "e2e-hash-b",
        linkId: landing.id,
        linkPageHasCountdown: true,
        referrer: "twitter.com",
        timestamp: now,
      },
      {
        browser: "Firefox",
        city: "London",
        country: "United Kingdom",
        device: "tablet",
        eventType: "DIRECT_REDIRECT",
        ipHash: "e2e-hash-c",
        linkId: docs.id,
        referrer: "newsletter.example.com",
        timestamp: yesterday,
      },
    ]),
  );

  return { docsSlug: docs.slug, landingSlug: landing.slug };
}

test.afterEach(async () => {
  await cleanupAnalyticsUsers();
});

test.describe("Analytics page", () => {
  test("shows empty analytics guidance and disables CSV export", async ({ page }) => {
    const user = await createAnalyticsUser("empty");

    await authenticateAs(page, user);
    await page.goto("/analytics?range=7");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByRole("heading", { name: "No click data yet" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
    await expect(page.getByText("No clicks in this range")).toBeVisible();
    await expect(page.getByText("No Link Page funnel data")).toBeVisible();
  });

  test("renders decision-ready analytics when click data exists", async ({ page }) => {
    const user = await createAnalyticsUser("data");
    const seeded = await seedAnalyticsData(user.id);

    await authenticateAs(page, user);
    await page.goto("/analytics?range=7");

    await expect(page.getByTestId("analytics-dashboard")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("analytics-kpi-total-clicks")).toContainText("3");
    await expect(page.getByTestId("analytics-kpi-link-page-views")).toContainText("1");
    await expect(page.getByTestId("analytics-kpi-cta-rate")).toContainText("100%");
    await expect(page.getByText("Link Page Funnel")).toBeVisible();
    await expect(page.getByText("Top Referrers")).toBeVisible();
    await expect(page.getByText("Top Locations")).toBeVisible();
    await expect(page.getByText("Top Links")).toBeVisible();
    await expect(page.getByText(seeded.landingSlug)).toBeVisible();
    await expect(page.getByText(seeded.docsSlug)).toBeVisible();
    await expect(page.getByText("Export CSV")).toBeVisible();
  });

  test("recovers from an invalid custom range with a friendly message", async ({
    page,
  }) => {
    const user = await createAnalyticsUser("invalid-range");

    await authenticateAs(page, user);
    await page.goto("/analytics?range=custom&from=2000-01-01&to=2000-01-02");

    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Showing the last 30 days instead."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "No click data yet" }),
    ).toBeVisible();
  });

  test("keeps analytics controls and tables usable on mobile", async ({ page }) => {
    const user = await createAnalyticsUser("mobile");
    await seedAnalyticsData(user.id);

    await page.setViewportSize({ height: 844, width: 390 });
    await authenticateAs(page, user);
    await page.goto("/analytics?range=7");

    await expect(page.getByRole("group", { name: "Analytics date range" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Top Links")).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
