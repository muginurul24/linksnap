import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";
import { redis } from "../../src/lib/redis";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

const testIp = "198.51.100.30";

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
        plan: "FREE",
      })
      .returning({ id: users.id }),
  );

  if (!user) throw new Error("Unable to create settings E2E user.");

  return user.id;
}

async function signIn(
  page: Page,
  {
    email,
    password,
  }: {
    email: string;
    password: string;
  },
): Promise<void> {
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

async function cleanupSettingsFlowState(
  email: string,
  userId?: string,
): Promise<void> {
  await retryTransientDb(() => db.delete(users).where(eq(users.email, email)));

  await redis.del(
    `rate-limit:auth:login:${testIp}`,
    "rate-limit:auth:login:unknown",
    ...(userId
      ? [
          `api:settings:profile:patch:${userId}`,
          `auth:change-password:${userId}`,
        ]
      : []),
  );
}

async function findSettingsUser(email: string) {
  const [user] = await retryTransientDb(() =>
    db
      .select({
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1),
  );

  return user ?? null;
}

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": testIp,
  },
});

test("should update profile and change password from settings page", async ({
  page,
}) => {
  const email = `e2e-settings-${Date.now()}@example.com`;
  const password = "Password1";
  const newPassword = "Password1234!";
  const displayName = "E2E Settings User";
  let userId: string | undefined;

  try {
    userId = await createVerifiedUser(email, password);
    await signIn(page, { email, password });

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByLabel("Full Name").fill(displayName);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Profile updated")).toBeVisible({
      timeout: 10_000,
    });
    await expect
      .poll(() => findSettingsUser(email).then((user) => user?.name ?? null), {
        message: "profile name should be persisted",
        timeout: 10_000,
      })
      .toBe(displayName);

    await page.getByRole("tab", { name: /Security/ }).click();
    await page.getByLabel("Current Password").fill(password);
    await page.getByLabel("New Password", { exact: true }).fill(newPassword);
    await expect(page.getByText("Password strength: Strong")).toBeVisible();
    await page.getByLabel("Confirm New Password").fill(newPassword);
    await page.getByRole("button", { name: "Update Password" }).click();
    await expect(page.getByText("Password changed")).toBeVisible({
      timeout: 10_000,
    });

    await expect
      .poll(
        async () => {
          const user = await findSettingsUser(email);
          return user?.passwordHash
            ? verifyPassword(newPassword, user.passwordHash)
            : false;
        },
        { message: "new password should be persisted", timeout: 10_000 },
      )
      .toBe(true);
  } finally {
    await cleanupSettingsFlowState(email, userId);
  }
});
