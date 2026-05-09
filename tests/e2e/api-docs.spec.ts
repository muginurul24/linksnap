import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../src/lib/auth/password";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.34";

test.setTimeout(120_000);

async function createPaidUser(email: string, password: string): Promise<string> {
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

  if (!user) throw new Error("Unable to create API docs E2E user.");

  return user.id;
}

async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);

  const credentialsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/callback/credentials") &&
      response.request().method() === "POST",
    { timeout: 45_000 },
  );

  await page.getByRole("button", { name: /^Sign in$/ }).click();
  expect((await credentialsResponsePromise).ok()).toBe(true);
}

async function cleanupApiDocsState(email: string, userId?: string): Promise<void> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    ...(userId ? [`rate-limit:api:docs:get:${userId}`] : []),
  );
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should show paid API docs and expose OpenAPI JSON", async ({ page }) => {
  const email = `e2e-docs-${Date.now()}@example.com`;
  const password = "Password1";
  let userId: string | undefined;

  try {
    userId = await createPaidUser(email, password);
    await signIn(page, email, password);

    await page.goto("/docs");
    await expect(page.getByRole("heading", { name: "API Docs" })).toBeVisible();
    await expect(page.getByText("Operations API")).toBeVisible();
    await expect(page.getByText("/api/v1/health")).toBeVisible();
    await expect(page.getByText("Admin API")).toBeVisible();

    const docsResponse = await page.request.get("/api/v1/docs");
    expect(docsResponse.ok()).toBe(true);
    const body = await docsResponse.json();
    expect(body.data.paths["/api/v1/health"]).toHaveProperty("get");
  } finally {
    await cleanupApiDocsState(email, userId);
  }
});
