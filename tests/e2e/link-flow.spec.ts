import { expect, test, type Browser, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { count, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { clickEvents, linkPages, links, users } from "../../src/lib/db/schema";
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
    ...(userId
      ? [
          `rate-limit:api:links:list:${userId}`,
          `rate-limit:api:links:page:get:${userId}`,
          `rate-limit:api:links:page:post:${userId}`,
          `rate-limit:api:links:rules:post:${userId}`,
          `rate-limit:api:links:slug:get:${userId}`,
          `rate-limit:links:create:${userId}`,
        ]
      : []),
    ...slugs.flatMap((slug) => [
      `linksnap:redirect:${slug}`,
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
