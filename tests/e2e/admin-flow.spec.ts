import { expect, test } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { users } from "../../src/lib/db/schema";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(90_000);

const SUPERADMIN_EMAIL = "iqooz9xmg@gmail.com";
const BASE_URL = process.env.TEST_APP_URL ?? "http://localhost:3000";

/**
 * Ensure the superadmin user exists with a known password hash.
 * Uses the seeded superadmin user (promoted by seed-superadmin script).
 */
async function ensureSuperadminExists(): Promise<void> {
  const existing = await retryTransientDb(() =>
    db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.email, SUPERADMIN_EMAIL))
      .limit(1),
  );

  if (existing.length === 0) {
    throw new Error(
      `Superadmin user ${SUPERADMIN_EMAIL} not found. Run "bun run seed:superadmin" first.`,
    );
  }

  // Ensure role is superadmin
  if (existing[0].role !== "superadmin") {
    await retryTransientDb(() =>
      db
        .update(users)
        .set({ role: "superadmin" })
        .where(eq(users.id, existing[0].id)),
    );
  }
}

test.describe("Admin Flow — Superadmin", () => {
  test.beforeAll(async () => {
    await ensureSuperadminExists();
  });

  test("admin nav appears after superadmin login", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Wait for login form
    await page.waitForSelector('input[name="email"]', { timeout: 10_000 });

    // Fill login credentials
    await page.fill('input[name="email"]', SUPERADMIN_EMAIL);
    await page.fill('input[name="password"]', "Test1234!");

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15_000 });

    // Verify admin nav section is visible in sidebar
    const adminNav = page.locator("text=Admin Dashboard");
    await expect(adminNav).toBeVisible({ timeout: 10_000 });

    // Verify plan label shows "Superadmin"
    const planLabel = page.locator("text=Superadmin");
    await expect(planLabel).toBeVisible();
  });

  test("admin dashboard page loads with stats cards", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);

    // Wait for page to load
    await page.waitForSelector("h1:has-text('Admin Dashboard')", {
      timeout: 10_000,
    });

    // Verify stats cards are rendered
    const totalUsersCard = page.locator("text=Total Users");
    await expect(totalUsersCard).toBeVisible({ timeout: 5_000 });

    const quickActions = page.locator("text=Quick Actions");
    await expect(quickActions).toBeVisible();

    // Verify quick action links
    const manageUsersLink = page.locator('a:has-text("Manage Users")');
    await expect(manageUsersLink).toBeVisible();

    const viewAuditLogLink = page.locator('a:has-text("View Audit Log")');
    await expect(viewAuditLogLink).toBeVisible();
  });

  test("user management page loads and supports search", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/users`);

    // Wait for the heading
    await page.waitForSelector("h1:has-text('User Management')", {
      timeout: 10_000,
    });

    // Verify search input exists
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Verify plan filter exists
    const planFilter = page.locator("text=All plans");
    await expect(planFilter).toBeVisible({ timeout: 5_000 });
  });

  test("system analytics page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/analytics`);

    // Wait for the heading
    await page.waitForSelector("h1:has-text('System Analytics')", {
      timeout: 10_000,
    });

    // Verify stats cards
    const totalUsersCard = page.locator("text=Total Users");
    await expect(totalUsersCard).toBeVisible({ timeout: 5_000 });

    // Verify plan distribution section
    const planDist = page.locator("text=Plan Distribution");
    await expect(planDist).toBeVisible({ timeout: 5_000 });
  });

  test("audit log page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-log`);

    // Wait for the heading
    await page.waitForSelector("h1:has-text('Audit Log')", {
      timeout: 10_000,
    });

    // Verify action filter exists
    const actionFilter = page.locator("text=All actions");
    await expect(actionFilter).toBeVisible({ timeout: 5_000 });
  });
});
