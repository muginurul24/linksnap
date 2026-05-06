import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { count, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { clickEvents, links, users } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.28";

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

async function cleanupLinkFlowState(email: string, userId?: string): Promise<void> {
  await db.delete(users).where(eq(users.email, email));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    ...(userId
      ? [
          `rate-limit:api:links:list:${userId}`,
          `rate-limit:api:links:slug:get:${userId}`,
          `rate-limit:links:create:${userId}`,
        ]
      : []),
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
