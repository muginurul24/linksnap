import { expect, test, type Page } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { encode } from "@auth/core/jwt";
import { eq, or } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { hashPassword } from "../../src/lib/auth/password";
import { adminAuditLog, users } from "../../src/lib/db/schema";
import { retryTransientDb } from "./db-retry";

loadEnvConfig(process.cwd());

test.setTimeout(90_000);

const SUPERADMIN_EMAIL =
  process.env.E2E_SUPERADMIN_EMAIL ?? "linksnap-e2e-superadmin@example.com";
const SUPERADMIN_PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? "Test1234!";
const SHOULD_CLEANUP_SUPERADMIN = !process.env.E2E_SUPERADMIN_EMAIL;
let e2eSuperadminUserId: string | null = null;

/**
 * Ensure the superadmin user exists with a known password hash.
 * A dedicated E2E account keeps the test from mutating a real admin password.
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
    const passwordHash = await hashPassword(SUPERADMIN_PASSWORD);
    const [created] = await retryTransientDb(() =>
      db
        .insert(users)
        .values({
          email: SUPERADMIN_EMAIL,
          emailVerified: new Date(),
          name: "LinkSnap E2E Superadmin",
          passwordHash,
          plan: "BUSINESS",
          role: "superadmin",
        })
        .returning({ id: users.id }),
    );
    e2eSuperadminUserId = created.id;
    return;
  }

  e2eSuperadminUserId = existing[0].id;

  if (SHOULD_CLEANUP_SUPERADMIN) {
    const passwordHash = await hashPassword(SUPERADMIN_PASSWORD);
    await retryTransientDb(() =>
      db
        .update(users)
        .set({
          deletedAt: null,
          emailVerified: new Date(),
          passwordHash,
          plan: "BUSINESS",
          role: "superadmin",
          twoFactorEnabled: false,
          twoFactorSecret: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id)),
    );
    return;
  }

  if (existing[0].role !== "superadmin") {
    await retryTransientDb(() =>
      db
        .update(users)
        .set({ role: "superadmin" })
        .where(eq(users.id, existing[0].id)),
    );
  }
}

async function cleanupSuperadmin(): Promise<void> {
  if (!SHOULD_CLEANUP_SUPERADMIN || !e2eSuperadminUserId) return;
  const userId = e2eSuperadminUserId;

  await retryTransientDb(() =>
    db
      .delete(adminAuditLog)
      .where(
        or(
          eq(adminAuditLog.adminUserId, userId),
          eq(adminAuditLog.targetUserId, userId),
        ),
      ),
  );
  await retryTransientDb(() =>
    db.delete(users).where(eq(users.id, userId)),
  );
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required for E2E auth.");
  return secret;
}

async function authenticateAsSuperadmin(page: Page): Promise<void> {
  if (!e2eSuperadminUserId) {
    throw new Error("E2E superadmin user was not initialized.");
  }

  const maxAge = 30 * 24 * 60 * 60;
  const token = await encode({
    maxAge,
    salt: "authjs.session-token",
    secret: getAuthSecret(),
    token: {
      email: SUPERADMIN_EMAIL,
      id: e2eSuperadminUserId,
      name: "LinkSnap E2E Superadmin",
      role: "superadmin",
      sub: e2eSuperadminUserId,
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

test.describe("Admin Flow — Superadmin", () => {
  test.beforeAll(async () => {
    await ensureSuperadminExists();
  });

  test.afterAll(async () => {
    await cleanupSuperadmin();
  });

  test("admin nav appears after superadmin login", async ({ page }) => {
    await authenticateAsSuperadmin(page);
    await page.goto("/links");

    // Verify admin nav section is visible in sidebar
    const adminNav = page.locator("text=Admin Dashboard");
    await expect(adminNav).toBeVisible({ timeout: 10_000 });

    // Verify plan label shows "Superadmin"
    const planLabel = page.getByText("Superadmin", { exact: true }).first();
    await expect(planLabel).toBeVisible();
  });

  test("admin dashboard page loads with stats cards", async ({ page }) => {
    await authenticateAsSuperadmin(page);
    await page.goto("/admin");

    // Wait for page to load
    await page.waitForSelector("h1:has-text('Admin Dashboard')", {
      timeout: 10_000,
    });

    // Verify stats cards are rendered
    const totalUsersCard = page.locator("text=Total Users");
    await expect(totalUsersCard).toBeVisible({ timeout: 5_000 });

    const quickActions = page.getByText("Quick Actions", { exact: true });
    await expect(quickActions).toBeVisible();

    // Verify quick action links
    const manageUsersLink = page.locator('a:has-text("Manage Users")');
    await expect(manageUsersLink).toBeVisible();

    const viewAuditLogLink = page.locator('a:has-text("View Audit Log")');
    await expect(viewAuditLogLink).toBeVisible();
  });

  test("user management page loads and supports search", async ({ page }) => {
    await authenticateAsSuperadmin(page);
    await page.goto("/admin/users");

    // Wait for the heading
    await page.waitForSelector("h1:has-text('User Management')", {
      timeout: 10_000,
    });

    // Verify search input exists
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });

    // Verify plan filter exists
    const planFilter = page.locator('[data-slot="select-trigger"]').first();
    await expect(planFilter).toBeVisible({ timeout: 30_000 });
  });

  test("system analytics page loads", async ({ page }) => {
    await authenticateAsSuperadmin(page);
    await page.goto("/admin/analytics");

    // Wait for the heading
    await expect(
      page.getByRole("heading", { name: "System Analytics" }),
    ).toBeVisible({ timeout: 30_000 });

    // Verify stats cards
    const totalUsersCard = page.locator("text=Total Users");
    await expect(totalUsersCard).toBeVisible({ timeout: 5_000 });

    // Verify plan distribution section
    const planDist = page.locator("text=Plan Distribution");
    await expect(planDist).toBeVisible({ timeout: 5_000 });
  });

  test("audit log page loads", async ({ page }) => {
    await authenticateAsSuperadmin(page);
    await page.goto("/admin/audit-log");

    // Wait for the heading
    await page.waitForSelector("h1:has-text('Audit Log')", {
      timeout: 10_000,
    });

    // Verify audit log table rendered after client-side fetch.
    await expect(page.getByText("Timestamp")).toBeVisible({ timeout: 30_000 });
  });
});
