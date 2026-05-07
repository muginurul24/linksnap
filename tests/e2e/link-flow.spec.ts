import { expect, test, type Browser, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { count, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  campaigns,
  clickEvents,
  linkPages,
  links,
  users,
} from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.28";
const mobileUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

async function createVerifiedUser(email: string, password: string): Promise<string> {
  await db.delete(users).where(eq(users.email, email));

  const [user] = await db
    .insert(users)
    .values({
      email,
      emailVerified: new Date(),
      passwordHash: await hashPassword(password),
      plan: "PRO",
    })
    .returning({ id: users.id });

  if (!user) throw new Error("Unable to create E2E user.");

  return user.id;
}

async function cleanupLinkFlowState(
  email: string,
  userId?: string,
  slugs: string[] = [],
): Promise<void> {
  await db.delete(users).where(eq(users.email, email));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    `rate-limit:api:qr:${testIp}`,
    ...(userId
      ? [
          `rate-limit:api:links:list:${userId}`,
          `rate-limit:api:links:page:get:${userId}`,
          `rate-limit:api:links:page:post:${userId}`,
          `rate-limit:api:links:rules:post:${userId}`,
          `rate-limit:api:links:slug:get:${userId}`,
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
  const [link] = await db
    .select({ id: links.id })
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1);

  if (!link) throw new Error("Created link was not found.");

  return link.id;
}

async function getLinkDestinationUrlBySlug(slug: string): Promise<string> {
  const [link] = await db
    .select({ destinationUrl: links.destinationUrl })
    .from(links)
    .where(eq(links.slug, slug))
    .limit(1);

  if (!link) throw new Error("Created link was not found.");

  return link.destinationUrl;
}

async function countClicksForLink(linkId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(clickEvents)
    .where(eq(clickEvents.linkId, linkId));

  return row?.value ?? 0;
}

async function createLinkPageFixture({
  slug,
  userId,
}: {
  slug: string;
  userId: string;
}): Promise<void> {
  const [link] = await db
    .insert(links)
    .values({
      clickCount: 42,
      destinationUrl: "https://example.com/preview",
      hasLinkPage: true,
      slug,
      title: "Preview promo",
      userId,
    })
    .returning({ id: links.id });

  if (!link) throw new Error("Unable to create preview link.");

  await db.insert(linkPages).values({
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
  });
}

async function signIn(page: Page, {
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const credentialsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
    { timeout: 20_000 },
  );

  await page.getByRole("button", { name: /^Sign in$/ }).click();
  const credentialsResponse = await credentialsResponsePromise;
  expect(credentialsResponse.ok()).toBe(true);
}

async function visitSlugWithUserAgent({
  baseURL,
  browser,
  slug,
  userAgent,
}: {
  baseURL: string;
  browser: Browser;
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
    await page.goto(`${baseURL}/${slug}`);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

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
    await page.getByLabel("Custom slug").fill(slug);
    await expect(page.getByText("Slug available.")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("Title").fill("E2E promo");
    await page.getByRole("button", { name: "Create link" }).click();

    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await expect(
      page.getByRole("table").getByText(`/${slug}`, { exact: true }),
    ).toBeVisible();

    const linkId = await getLinkIdBySlug(slug);
    await page.goto(`/${slug}`);
    await page.waitForURL("https://example.com/e2e", { timeout: 15_000 });

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

    await page.getByRole("button", { name: `Preview Link Page for ${slug}` }).click();

    await expect(page.getByText("Link Page preview")).toBeVisible();
    await expect(page.getByText("Preview Launch")).toBeVisible();
    await expect(page.getByText("Dashboard preview copy.")).toBeVisible();
    await expect(page.getByText("Open offer")).toBeVisible();
    await expect(page.getByText("42 people clicked this link")).toBeVisible();

    await page.getByRole("button", { name: "Desktop" }).click();
    await expect(page.getByRole("button", { name: "Desktop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  } finally {
    await cleanupLinkFlowState(email, userId);
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
    await page.getByLabel("Custom slug").fill(slug);
    await expect(page.getByText("Slug available.")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("Title").fill("E2E page promo");
    await page.getByRole("switch", { name: "Enable Link Page" }).click();
    await page.getByLabel("Brand name").fill("E2E Brand");
    await page.getByLabel("Page title").fill("E2E Link Page");
    await page.getByLabel("Description").fill("Public Link Page body.");
    await page.getByLabel("CTA text").fill("Open offer");
    await page.getByRole("button", { name: "Create link" }).click();

    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    const linkId = await getLinkIdBySlug(slug);
    await page.goto(`/${slug}`);

    await expect(page.getByText("E2E Brand")).toBeVisible();
    await expect(page.getByText("E2E Link Page")).toBeVisible();
    await expect(page.getByText("Public Link Page body.")).toBeVisible();

    await page.getByRole("link", { name: "Open offer" }).click();
    await page.waitForURL("https://example.com/e2e-page", { timeout: 15_000 });

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
    await page.getByLabel("Custom slug").fill(slug);
    await expect(page.getByText("Slug available.")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("Title").fill("E2E Smart Rule promo");
    await page.getByRole("button", { name: "Create link" }).click();
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });

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
    });
    expect(rulesResponse.ok()).toBe(true);

    await expect
      .poll(
        () =>
          visitSlugWithUserAgent({
            baseURL: appBaseUrl,
            browser,
            slug,
            userAgent: mobileUserAgent,
          }),
        { message: "mobile user agent should match Smart Rule", timeout: 15_000 },
      )
      .toBe("https://example.com/mobile-rule");

    await expect
      .poll(
        () =>
          visitSlugWithUserAgent({
            baseURL: appBaseUrl,
            browser,
            slug,
            userAgent: desktopUserAgent,
          }),
        { message: "desktop user agent should use default destination", timeout: 15_000 },
      )
      .toBe("https://example.com/default");

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

    await db.insert(links).values({
      destinationUrl: "https://example.com/campaign-offer",
      slug,
      title: "Campaign E2E",
      userId,
    });

    await signIn(page, { email, password });
    await expect(page).toHaveURL(/\/links$/, { timeout: 15_000 });
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: "Campaigns" })).toBeVisible();

    const campaignResponse = await page.request.post("/api/v1/campaigns", {
      data: {
        name: "Ramadhan E2E",
        slug: campaignSlug,
        utmCampaign: "ramadhan-2026",
        utmMedium: "social",
        utmSource: "instagram",
      },
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
  } finally {
    if (userId) {
      await db.delete(campaigns).where(eq(campaigns.userId, userId));
    }
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

    await db.insert(links).values({
      destinationUrl: "https://example.com/qr-download",
      slug,
      title: "QR Download",
      userId,
    });

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
  } finally {
    await cleanupLinkFlowState(email, userId, [slug]);
  }
});
