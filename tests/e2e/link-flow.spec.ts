import { expect, test, type Browser, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  campaigns,
  clickEvents,
  linkPages,
  links,
  users,
} from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import {
  REDIRECT_CLICK_DEAD_LETTER_KEY,
  REDIRECT_CLICK_QUEUE_KEY,
} from "../../src/lib/analytics/click-queue";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.28";
const e2eCronSecret = "e2e-cron-secret";
const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

test.setTimeout(180_000);

async function createVerifiedUser(email: string, password: string): Promise<string> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));

  const passwordHash = await hashPassword(password);
  const [user] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        passwordHash,
        plan: "PRO",
      })
      .returning({ id: users.id }),
  );

  if (!user) throw new Error("Unable to create E2E user.");

  return user.id;
}

async function cleanupRedirectClickQueue(): Promise<void> {
  await redis.del(REDIRECT_CLICK_QUEUE_KEY, REDIRECT_CLICK_DEAD_LETTER_KEY);
}

async function cleanupLinkFlowState(
  email: string,
  userId?: string,
  slugs: string[] = [],
): Promise<void> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    `rate-limit:api:qr:${testIp}`,
    REDIRECT_CLICK_DEAD_LETTER_KEY,
    REDIRECT_CLICK_QUEUE_KEY,
    ...(userId
      ? [
          `rate-limit:api:links:list:${userId}`,
          `rate-limit:api:links:page:get:${userId}`,
          `rate-limit:api:links:page:post:${userId}`,
          `rate-limit:api:links:rules:post:${userId}`,
          `rate-limit:api:links:slug:get:${userId}`,
          `rate-limit:api:links:split-test:get:${userId}`,
          `rate-limit:api:links:split-test:post:${userId}`,
          `rate-limit:api:campaigns:analytics:get:${userId}`,
          `rate-limit:api:campaigns:links:post:${userId}`,
          `rate-limit:api:campaigns:post:${userId}`,
          `rate-limit:links:create:${userId}`,
        ]
      : []),
    ...slugs.flatMap((slug) => [
      `linksnap:redirect:${slug}`,
      `linksnap:qr:${slug}:png:300`,
      `linksnap:qr:${slug}:svg:300`,
      `linksnap:smart-rules:${slug}`,
    ]),
  );
}

async function getLinkIdBySlug(slug: string): Promise<string> {
  const [link] = await retryTransientDb(() =>
    db
      .select({ id: links.id })
      .from(links)
      .where(eq(links.slug, slug))
      .limit(1),
  );

  if (!link) throw new Error("Created link was not found.");

  return link.id;
}

async function getLinkDestinationUrlBySlug(slug: string): Promise<string> {
  const [link] = await retryTransientDb(() =>
    db
      .select({ destinationUrl: links.destinationUrl })
      .from(links)
      .where(eq(links.slug, slug))
      .limit(1),
  );

  if (!link) throw new Error("Created link was not found.");

  return link.destinationUrl;
}

async function countClicksForLink(linkId: string): Promise<number> {
  const [row] = await retryTransientDb(() =>
    db
      .select({ value: count() })
      .from(clickEvents)
      .where(eq(clickEvents.linkId, linkId)),
  );

  return row?.value ?? 0;
}

async function countLinksAssignedToCampaign({
  campaignId,
  linkIds,
}: {
  campaignId: string;
  linkIds: string[];
}): Promise<number> {
  const [row] = await retryTransientDb(() =>
    db
      .select({ value: count() })
      .from(links)
      .where(and(eq(links.campaignId, campaignId), inArray(links.id, linkIds))),
  );

  return row?.value ?? 0;
}

async function countPausedLinks(linkIds: string[]): Promise<number> {
  const [row] = await retryTransientDb(() =>
    db
      .select({ value: count() })
      .from(links)
      .where(and(eq(links.isActive, false), inArray(links.id, linkIds))),
  );

  return row?.value ?? 0;
}

async function processRedirectClickQueue(page: Page): Promise<void> {
  const response = await page.request.get(
    "/api/v1/analytics/click-queue/process?limit=100",
    {
      headers: {
        authorization: `Bearer ${e2eCronSecret}`,
      },
    },
  );

  expect(response.ok()).toBe(true);
}

async function createBulkLinksFixture({
  marker,
  userId,
}: {
  marker: string;
  userId: string;
}): Promise<{ campaignId: string; linkIds: string[]; slugs: string[] }> {
  const [campaign] = await retryTransientDb(() =>
    db
      .insert(campaigns)
      .values({
        name: "Bulk Campaign",
        slug: `bulk-campaign-${marker}`,
        userId,
        utmCampaign: `bulk-${marker}`,
        utmMedium: "dashboard",
        utmSource: "links",
      })
      .returning({ id: campaigns.id }),
  );

  if (!campaign) throw new Error("Unable to create bulk campaign.");

  const createdAt = new Date("2026-05-01T00:00:00Z");
  const insertedLinks = await retryTransientDb(() =>
    db
      .insert(links)
      .values([
        {
          clickCount: 1,
          createdAt,
          destinationUrl: "https://example.com/bulk-alpha",
          slug: `bulk-a-${marker}`,
          title: "Bulk Alpha",
          userId,
        },
        {
          clickCount: 4,
          createdAt: new Date("2026-05-02T00:00:00Z"),
          destinationUrl: "https://example.com/bulk-zeta",
          slug: `bulk-z-${marker}`,
          title: "Bulk Zeta",
          userId,
        },
      ])
      .returning({ id: links.id, slug: links.slug }),
  );

  if (insertedLinks.length !== 2) throw new Error("Unable to create bulk links.");

  await retryTransientDb(() =>
    db.insert(clickEvents).values([
      {
        eventType: "DIRECT_REDIRECT",
        linkId: insertedLinks[0]?.id,
        timestamp: new Date("2026-05-08T10:00:00Z"),
      },
      {
        eventType: "DIRECT_REDIRECT",
        linkId: insertedLinks[1]?.id,
        timestamp: new Date("2026-05-08T10:00:00Z"),
      },
      {
        eventType: "DIRECT_REDIRECT",
        linkId: insertedLinks[1]?.id,
        timestamp: new Date("2026-05-08T11:00:00Z"),
      },
      {
        eventType: "LINK_PAGE_CTA_CLICK",
        linkId: insertedLinks[1]?.id,
        timestamp: new Date("2026-05-08T12:00:00Z"),
      },
    ]),
  );

  return {
    campaignId: campaign.id,
    linkIds: insertedLinks.map((link) => link.id),
    slugs: insertedLinks.map((link) => link.slug),
  };
}

async function createLinkPageFixture({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}): Promise<void> {
  const [link] = await retryTransientDb(() =>
    db
      .insert(links)
      .values({
        clickCount: 42,
        destinationUrl: "https://example.com/preview",
        hasLinkPage: true,
        slug,
        title: "Preview promo",
        userId,
      })
      .returning({ id: links.id }),
  );

  if (!link) throw new Error("Unable to create preview link.");

  await retryTransientDb(() =>
    db.insert(linkPages).values({
      brandName: "Acme Preview",
      countdownTarget: new Date(Date.now() + 86_400_000),
      ctaColor: "#0f766e",
      ctaText: "Open offer",
      description: "Dashboard preview copy.",
      linkId: link.id,
      showCountdown: true,
      showQrCode: false,
      showSocialProof: true,
      theme: "light",
      title: "Preview Launch",
    }),
  );
}

async function signIn(page: Page, {
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto("/login");
    if (new URL(page.url()).pathname !== "/login") {
      await page.goto("/links");
      await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
      return;
    }

    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password", { exact: true });

    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await emailInput.fill(email);
    await expect(emailInput).toHaveValue(email, { timeout: 5_000 });
    await passwordInput.fill(password);
    await expect(passwordInput).toHaveValue(password, { timeout: 5_000 });

    const credentialsResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/callback/credentials") &&
        response.request().method() === "POST",
      { timeout: 60_000 },
    ).catch(() => null);

    await page.getByRole("button", { name: /^Sign in$/ }).click();
    const credentialsResponse = await credentialsResponsePromise;
    lastStatus = credentialsResponse?.status() ?? 0;
    if (credentialsResponse?.ok()) {
      const navigated = await page
        .waitForURL(/\/links$/, { timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) return;
      await page.goto("/links");
      if (new URL(page.url()).pathname === "/links") return;
    }

    if (!credentialsResponse) {
      const navigated = await page
        .waitForURL(/\/links$/, { timeout: 5_000 })
        .then(() => true)
        .catch(() => false);
      if (navigated) return;
    }

    await page.waitForTimeout(attempt * 500);
  }

  expect(lastStatus).toBeGreaterThanOrEqual(200);
  expect(lastStatus).toBeLessThan(300);
}

function responsePath(response: { url(): string }): string {
  return new URL(response.url()).pathname;
}

async function fillSlugAndWaitForAvailability(
  page: Page,
  slug: string,
): Promise<void> {
  const slugResponsePromise = page.waitForResponse(
    (response) =>
      responsePath(response) === `/api/v1/links/slug/${slug}` &&
      response.request().method() === "GET",
    { timeout: 45_000 },
  );

  await page.getByLabel("Custom slug").fill(slug);
  expect((await slugResponsePromise).ok()).toBe(true);
  await expect(page.getByText("Slug available.")).toBeVisible({
    timeout: 30_000,
  });
}

async function submitCreateLinkForm(
  page: Page,
  { withLinkPage = false }: { withLinkPage?: boolean } = {},
): Promise<void> {
  const createResponsePromise = page.waitForResponse(
    (response) =>
      responsePath(response) === "/api/v1/links" &&
      response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const linkPageResponsePromise = withLinkPage
    ? page.waitForResponse(
        (response) =>
          responsePath(response).startsWith("/api/v1/links/") &&
          responsePath(response).endsWith("/page") &&
          response.request().method() === "POST",
        { timeout: 60_000 },
      )
    : null;

  await page.getByRole("button", { name: "Create link" }).click();
  expect((await createResponsePromise).ok()).toBe(true);

  if (linkPageResponsePromise) {
    expect((await linkPageResponsePromise).ok()).toBe(true);
  }

  await expect(page).toHaveURL(/\/links$/, { timeout: 45_000 });
}

async function visitSlugWithUserAgent({
  baseURL,
  browser,
  expectedUrl,
  slug,
  userAgent,
}: {
  baseURL: string;
  browser: Browser;
  expectedUrl: string;
  slug: string;
  userAgent: string;
}): Promise<string> {
  const context = await browser.newContext({
    extraHTTPHeaders: {
      "x-forwarded-for": testIp,
    },
    userAgent,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/${slug}`, {
      timeout: 20_000,
      waitUntil: "commit",
    });
    await page
      .waitForURL(expectedUrl, { timeout: 20_000 })
      .catch((error: unknown) => {
        if (error instanceof Error && error.message.includes("ERR_ABORTED")) return;

        throw error;
      });

    return page.url();
  } finally {
    await context.close();
  }
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test.beforeEach(async () => {
  await cleanupRedirectClickQueue();
});

test("should create link from dashboard then log redirect analytics", async ({ page }) => {
  const email = `e2e-link-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `e2e-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);

    await signIn(page, { email, password });

    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await expect(
      page.getByText("No links yet. Create your first short link!"),
    ).toBeVisible();

    await page.getByRole("link", { name: "Create link", exact: true }).click();
    await page.getByLabel("Destination URL").fill("https://example.com/e2e");
    await fillSlugAndWaitForAvailability(page, slug);
    await page.getByLabel("Title").fill("E2E promo");
    await submitCreateLinkForm(page);
    await expect(
      page.getByRole("table").getByText(`/${slug}`, { exact: true }),
    ).toBeVisible();

    const linkId = await getLinkIdBySlug(slug);
    await page.goto(`/${slug}`);
    await page.waitForURL("https://example.com/e2e", { timeout: 15_000 });
    await processRedirectClickQueue(page);

    await expect
      .poll(() => countClicksForLink(linkId), {
        message: "redirect click should be logged",
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
  } finally {
    await cleanupLinkFlowState(email, userId);
  }
});

test("should preview a Link Page from the dashboard links table", async ({ page }) => {
  const email = `e2e-preview-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `preview-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    await createLinkPageFixture({ slug, userId });

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

    const previewResponsePromise = page.waitForResponse(
      (response) =>
        responsePath(response).startsWith("/api/v1/links/") &&
        responsePath(response).endsWith("/page") &&
        response.request().method() === "GET",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: `Preview Link Page for ${slug}` }).click();
    expect((await previewResponsePromise).ok()).toBe(true);

    await expect(page.getByText("Link Page preview")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Preview Launch")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Dashboard preview copy.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Open offer")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("42 people clicked this link")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Desktop" }).click();
    await expect(page.getByRole("button", { name: "Desktop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  } finally {
    await cleanupLinkFlowState(email, userId);
  }
});

test("should navigate from Link Pages cards to edit pages with breadcrumbs", async ({
  page,
}) => {
  const email = `e2e-pages-nav-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `pages-nav-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    await createLinkPageFixture({ slug, userId });

    await signIn(page, { email, password });
    await page.goto("/pages");
    await expect(
      page.getByRole("heading", { exact: true, name: "Link Pages" }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Edit Link Page for Acme Preview" })
      .click();

    await expect(page).toHaveURL(new RegExp(`/links/${slug}/edit$`), {
      timeout: 15_000,
    });
    await expect(page.getByRole("heading", { name: "Edit Link" })).toBeVisible();
    await expect(
      page.locator('[data-slot="breadcrumb"]').filter({ hasText: "My Links" }),
    ).toContainText(`/${slug}`);
  } finally {
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});

test("should sort and bulk manage links from the dashboard table", async ({ page }) => {
  const marker = `${Date.now()}`;
  const email = `e2e-bulk-${marker}@example.com`;
  const password = "Password1";
  let userId: string | undefined;
  let fixture:
    | { campaignId: string; linkIds: string[]; slugs: string[] }
    | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    fixture = await createBulkLinksFixture({ marker, userId });

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

    await expect(page.getByText("2 visible links")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("3 7d")).toBeVisible();

    await page.getByRole("button", { name: /^Link$/ }).click();
    await expect(page.getByRole("row").nth(1)).toContainText(
      `/${fixture.slugs[0]}`,
    );

    await page.getByLabel("Select all visible links").check();
    await expect(page.getByText("2 selected")).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/linksnap-links-\d{4}-\d{2}-\d{2}\.csv/);

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        responsePath(response) ===
          `/api/v1/campaigns/${fixture?.campaignId}/links` &&
        response.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Add to Campaign" }).click();
    expect((await assignResponsePromise).ok()).toBe(true);
    await expect
      .poll(() =>
        fixture
          ? countLinksAssignedToCampaign({
              campaignId: fixture.campaignId,
              linkIds: fixture.linkIds,
            })
          : 0,
      )
      .toBe(2);

    await page.getByLabel("Select all visible links").check();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(
      page.getByText("Are you sure you want to delete 2 selected links?"),
    ).toBeVisible();
    const deleteResponses: number[] = [];
    page.on("response", (response) => {
      if (
        responsePath(response).startsWith("/api/v1/links/") &&
        response.request().method() === "DELETE"
      ) {
        deleteResponses.push(response.status());
      }
    });
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

    await expect
      .poll(() => deleteResponses.length, { timeout: 60_000 })
      .toBe(2);
    expect(deleteResponses.every((status) => status >= 200 && status < 300)).toBe(
      true,
    );
    await expect
      .poll(() => (fixture ? countPausedLinks(fixture.linkIds) : 0), {
        timeout: 30_000,
      })
      .toBe(2);
  } finally {
    await cleanupLinkFlowState(email, userId, fixture?.slugs ?? []);
  }
});

test("should configure a Link Page then render the public page and CTA redirect", async ({
  page,
}) => {
  const email = `e2e-page-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `page-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

    await page.getByRole("link", { name: "Create link", exact: true }).click();
    await page.getByLabel("Destination URL").fill("https://example.com/e2e-page");
    await fillSlugAndWaitForAvailability(page, slug);
    await page.getByLabel("Title").fill("E2E page promo");
    await page.getByRole("switch", { name: "Enable Link Page" }).click();
    await page.getByLabel("Brand name").fill("E2E Brand");
    await page.getByLabel("Page title").fill("E2E Link Page");
    await page.getByLabel("Description").fill("Public Link Page body.");
    await page.getByLabel("CTA text").fill("Open offer");
    await submitCreateLinkForm(page, { withLinkPage: true });
    const linkId = await getLinkIdBySlug(slug);
    await page.goto(`/${slug}`);

    await expect(page.getByText("E2E Brand")).toBeVisible();
    await expect(page.getByText("E2E Link Page")).toBeVisible();
    await expect(page.getByText("Public Link Page body.")).toBeVisible();

    await page.getByRole("link", { name: "Open offer" }).click();
    await page.waitForURL("https://example.com/e2e-page", { timeout: 15_000 });
    await processRedirectClickQueue(page);

    await expect
      .poll(() => countClicksForLink(linkId), {
        message: "Link Page view and CTA click should be logged",
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(2);
  } finally {
    await cleanupLinkFlowState(email, userId);
  }
});

test("should configure Smart Rules then redirect by browser user agent", async ({
  baseURL,
  browser,
  page,
}) => {
  const email = `e2e-rules-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `rules-${Date.now()}`;
  const appBaseUrl = baseURL ?? "http://127.0.0.1:3100";
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

    await page.getByRole("link", { name: "Create link", exact: true }).click();
    await page.getByLabel("Destination URL").fill("https://example.com/default");
    await fillSlugAndWaitForAvailability(page, slug);
    await page.getByLabel("Title").fill("E2E Smart Rule promo");
    await submitCreateLinkForm(page);

    const linkId = await getLinkIdBySlug(slug);
    const rulesResponse = await page.request.post(`/api/v1/links/${linkId}/rules`, {
      data: {
        rules: [
          {
            condition: { device: "mobile" },
            destinationUrl: "https://example.com/mobile-rule",
            priority: 10,
            type: "DEVICE",
          },
        ],
      },
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    expect(rulesResponse.ok()).toBe(true);

    await expect
      .poll(
        () =>
          visitSlugWithUserAgent({
            baseURL: appBaseUrl,
            browser,
            expectedUrl: "https://example.com/mobile-rule",
            slug,
            userAgent: mobileUserAgent,
          }),
        { message: "mobile user agent should match Smart Rule", timeout: 30_000 },
      )
      .toBe("https://example.com/mobile-rule");

    await expect
      .poll(
        () =>
          visitSlugWithUserAgent({
            baseURL: appBaseUrl,
            browser,
            expectedUrl: "https://example.com/default",
            slug,
            userAgent: desktopUserAgent,
          }),
        {
          message: "desktop user agent should use default destination",
          timeout: 30_000,
        },
      )
      .toBe("https://example.com/default");
    await processRedirectClickQueue(page);

    await expect
      .poll(() => countClicksForLink(linkId), {
        message: "Smart Rule redirects should be logged",
        timeout: 10_000,
      })
      .toBeGreaterThanOrEqual(2);
  } finally {
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});

test("should run campaign workflow from an authenticated dashboard session", async ({
  page,
}) => {
  const email = `e2e-campaign-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `campaign-${Date.now()}`;
  const campaignSlug = `campaign-flow-${Date.now()}`;
  const taggedUrl =
    "https://example.com/campaign-offer?utm_source=instagram&utm_medium=social&utm_campaign=ramadhan-2026";
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    const createdUserId = userId;

    await retryTransientDb(() =>
      db.insert(links).values({
        destinationUrl: "https://example.com/campaign-offer",
        slug,
        title: "Campaign E2E",
        userId: createdUserId,
      }),
    );

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await page.goto("/campaigns");
    await expect(
      page.getByRole("heading", { exact: true, name: "Campaigns" }),
    ).toBeVisible();

    const campaignResponse = await page.request.post("/api/v1/campaigns", {
      data: {
        name: "Ramadhan E2E",
        slug: campaignSlug,
        utmCampaign: "ramadhan-2026",
        utmMedium: "social",
        utmSource: "instagram",
      },
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
      timeout: 60_000,
    });
    expect(campaignResponse.ok()).toBe(true);
    const campaignBody = (await campaignResponse.json()) as {
      data: { id: string };
      success: true;
    };

    const linkId = await getLinkIdBySlug(slug);
    const addLinksResponse = await page.request.post(
      `/api/v1/campaigns/${campaignBody.data.id}/links`,
      {
        data: { linkIds: [linkId] },
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        timeout: 60_000,
      },
    );
    expect(addLinksResponse.ok()).toBe(true);
    await expect
      .poll(() => getLinkDestinationUrlBySlug(slug), {
        message: "campaign UTM params should be saved to the link",
        timeout: 10_000,
      })
      .toBe(taggedUrl);

    await page.goto(`/${slug}`);
    await page.waitForURL(taggedUrl, { timeout: 15_000 });
    await processRedirectClickQueue(page);

    await expect
      .poll(() => countClicksForLink(linkId), {
        message: "campaign redirect click should be logged",
        timeout: 10_000,
      })
      .toBeGreaterThan(0);

    const from = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const analyticsResponse = await page.request.get(
      `/api/v1/campaigns/${campaignBody.data.id}/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );
    expect(analyticsResponse.ok()).toBe(true);
    const analyticsBody = (await analyticsResponse.json()) as {
      data: {
        topLinks: Array<{ id: string; slug: string }>;
        totalClicks: number;
      };
      success: true;
    };

    expect(analyticsBody.success).toBe(true);
    expect(analyticsBody.data.totalClicks).toBeGreaterThan(0);
    expect(analyticsBody.data.topLinks[0]).toMatchObject({ id: linkId, slug });

    await page.goto("/campaigns");
    await expect(page.getByText("Ramadhan E2E")).toBeVisible();
    await page
      .getByRole("button", { name: "Open actions for Ramadhan E2E" })
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(
      page.getByText("Are you sure you want to delete Ramadhan E2E?"),
    ).toBeVisible();
    const deleteCampaignResponsePromise = page.waitForResponse(
      (response) =>
        responsePath(response) === `/api/v1/campaigns/${campaignBody.data.id}` &&
        response.request().method() === "DELETE",
      { timeout: 45_000 },
    );
    await page.getByRole("button", { name: "Delete" }).click();
    expect((await deleteCampaignResponsePromise).ok()).toBe(true);

    await expect
      .poll(
        async () =>
          retryTransientDb(() =>
            db
              .select({ value: count() })
              .from(campaigns)
              .where(eq(campaigns.id, campaignBody.data.id))
              .then((rows) => rows[0]?.value ?? 0),
          ),
        { message: "campaign should be deleted", timeout: 30_000 },
      )
      .toBe(0);
  } finally {
    if (userId) {
      const createdUserId = userId;
      await retryTransientDb(() =>
        db.delete(campaigns).where(eq(campaigns.userId, createdUserId)),
      );
    }
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});

test("should configure an A/B split test from an authenticated dashboard session", async ({
  page,
}) => {
  const email = `e2e-split-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `split-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    const createdUserId = userId;

    const [link] = await retryTransientDb(() =>
      db
        .insert(links)
        .values({
          destinationUrl: "https://example.com/default-split",
          hasLinkPage: true,
          slug,
          title: "Split E2E",
          userId: createdUserId,
        })
        .returning({ id: links.id }),
    );

    if (!link) throw new Error("Unable to create split test link.");

    await retryTransientDb(() =>
      db.insert(linkPages).values({
        brandName: "Split Test",
        ctaText: "Open variant",
        description: "Split test body.",
        linkId: link.id,
        showCountdown: false,
        showQrCode: false,
        showSocialProof: false,
        theme: "light",
        title: "Split Test Page",
      }),
    );

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await expect(
      page.getByRole("table").getByText(`/${slug}`, { exact: true }),
    ).toBeVisible();

    const linkId = link.id;
    const splitResponse = await page.request.post(
      `/api/v1/links/${linkId}/split-test`,
      {
        data: {
          variants: [
            { destinationUrl: "https://example.com/split-a", weight: 50 },
            { destinationUrl: "https://example.com/split-b", weight: 50 },
          ],
        },
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );
    expect(splitResponse.ok()).toBe(true);

    const configResponse = await page.request.get(
      `/api/v1/links/${linkId}/split-test`,
    );
    expect(configResponse.ok()).toBe(true);
    const configBody = (await configResponse.json()) as {
      data: {
        splitTest: {
          variants: Array<{ destinationUrl: string; weight: number }>;
        } | null;
      };
      success: true;
    };

    expect(configBody.success).toBe(true);
    expect(configBody.data.splitTest?.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          destinationUrl: "https://example.com/split-a",
          weight: 50,
        }),
        expect.objectContaining({
          destinationUrl: "https://example.com/split-b",
          weight: 50,
        }),
      ]),
    );

    const redirectResponse = await page.request.get(`/${slug}/go`, {
      maxRedirects: 0,
      timeout: 60_000,
    });
    expect(redirectResponse.status()).toBe(308);
    expect(redirectResponse.headers().location).toMatch(
      /^https:\/\/example\.com\/split-[ab]\/?$/,
    );

    const performanceResponse = await page.request.get(
      `/api/v1/links/${linkId}/split-test`,
    );
    const performanceBody = (await performanceResponse.json()) as {
      data: {
        splitTest: {
          performance: { totalVariantClicks: number };
        } | null;
      };
      success: true;
    };

    expect(performanceBody.success).toBe(true);
    expect(
      performanceBody.data.splitTest?.performance.totalVariantClicks,
    ).toBeGreaterThanOrEqual(1);
  } finally {
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});

test("should download QR codes from the QR dashboard", async ({ page }) => {
  const email = `e2e-qr-${Date.now()}@example.com`;
  const password = "Password1";
  const slug = `qr-${Date.now()}`;
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    const createdUserId = userId;

    await retryTransientDb(() =>
      db.insert(links).values({
        destinationUrl: "https://example.com/qr-download",
        slug,
        title: "QR Download",
        userId: createdUserId,
      }),
    );

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

    await page.goto("/qr");
    await expect(page.getByText("QR Download")).toBeVisible();

    const pngDownloadPromise = page.waitForEvent("download");
    await page
      .getByRole("link", { name: `Download PNG QR for ${slug}` })
      .click();
    const pngDownload = await pngDownloadPromise;
    const pngPath = await pngDownload.path();
    if (!pngPath) throw new Error("PNG download path was not available.");
    const pngBytes = await readFile(pngPath);

    expect(pngDownload.suggestedFilename()).toBe(`${slug}.png`);
    expect([...pngBytes.subarray(0, 8)]).toEqual([
      137,
      80,
      78,
      71,
      13,
      10,
      26,
      10,
    ]);

    const svgDownloadPromise = page.waitForEvent("download");
    await page
      .getByRole("link", { name: `Download SVG QR for ${slug}` })
      .click();
    const svgDownload = await svgDownloadPromise;
    const svgPath = await svgDownload.path();
    if (!svgPath) throw new Error("SVG download path was not available.");
    const svgContent = await readFile(svgPath, "utf8");

    expect(svgDownload.suggestedFilename()).toBe(`${slug}.svg`);
    expect(svgContent).toContain("<svg");

    await page.getByRole("link", { name: "View Link" }).click();
    await expect(page).toHaveURL(new RegExp(`/links/${slug}/edit$`), {
      timeout: 15_000,
    });
    await expect(
      page.locator('[data-slot="breadcrumb"]').filter({ hasText: "My Links" }),
    ).toContainText(`/${slug}`);
  } finally {
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});
