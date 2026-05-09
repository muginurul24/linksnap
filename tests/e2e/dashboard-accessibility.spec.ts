import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { encode } from "@auth/core/jwt";
import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

type AccessibilityUser = {
  email: string;
  id: string;
};

const dashboardRoutes = ["/dashboard", "/links", "/campaigns", "/analytics"] as const;
let testUser: AccessibilityUser | null = null;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required for E2E auth.");
  }

  return secret;
}

async function createAccessibilityUser(): Promise<AccessibilityUser> {
  const email = `linksnap-e2e-a11y-${randomUUID()}@example.com`;
  const [created] = await retryTransientDb(() =>
    db
      .insert(users)
      .values({
        email,
        emailVerified: new Date(),
        name: "LinkSnap E2E Accessibility User",
        plan: "PRO",
        role: "user",
      })
      .returning({ id: users.id }),
  );

  if (!created) throw new Error("Unable to create accessibility E2E user.");

  return { email, id: created.id };
}

async function authenticateAs(page: Page, user: AccessibilityUser): Promise<void> {
  const maxAge = 30 * 24 * 60 * 60;
  const token = await encode({
    maxAge,
    salt: "authjs.session-token",
    secret: getAuthSecret(),
    token: {
      email: user.email,
      id: user.id,
      name: "LinkSnap E2E Accessibility User",
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

test.describe("authenticated dashboard accessibility", () => {
  test.beforeAll(async () => {
    testUser = await createAccessibilityUser();
  });

  test.afterAll(async () => {
    if (!testUser) return;
    const user = testUser;
    await retryTransientDb(() => db.delete(users).where(eq(users.id, user.id)));
  });

  for (const route of dashboardRoutes) {
    test(`should pass WCAG 2.1 AA checks on ${route}`, async ({ page }) => {
      if (!testUser) throw new Error("Accessibility E2E user was not initialized.");
      const user = testUser;

      await authenticateAs(page, user);
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
