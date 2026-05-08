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
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await authenticateAsSuperadmin(page);
    await page.goto("/links");

    // Verify admin nav section is visible in sidebar
    const adminNav = page.locator("text=Admin Dashboard");
    await expect(adminNav).toBeVisible({ timeout: 10_000 });

    // Verify plan label shows "Superadmin"
    const planLabel = page.getByText("Superadmin", { exact: true }).first();
    await expect(planLabel).toBeVisible();

    await page.locator('[data-slot="dropdown-menu-trigger"]').last().click();
    await expect(page.getByText("My Account", { exact: true })).toBeVisible();
    expect(consoleErrors.join("\n")).not.toContain(
      "app_sidebar_dropdown_menu_render_error",
    );
  });

  test("account dropdown stays inside the mobile sidebar viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await authenticateAsSuperadmin(page);
    await page.goto("/links");

    await page.getByRole("button", { name: "Toggle Sidebar" }).click();

    const mobileSidebar = page.locator('[data-sidebar="sidebar"][data-mobile="true"]');
    await expect(mobileSidebar).toBeVisible({ timeout: 10_000 });

    await mobileSidebar.locator('[data-slot="dropdown-menu-trigger"]').last().click();

    const accountMenu = page
      .locator('[data-slot="dropdown-menu-content"]')
      .filter({ hasText: "My Account" })
      .last();
    await expect(accountMenu).toBeVisible({ timeout: 10_000 });

    const box = await accountMenu.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
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

  test("admin plan update sends required mutation header and shows friendly errors", async ({
    page,
  }) => {
    const targetUserId = "227b968f-ef1b-4432-a601-6fb63b02d7ed";
    const pageErrors: string[] = [];
    let mutationHeader: string | undefined;

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await authenticateAsSuperadmin(page);
    await page.route(`**/api/v1/admin/users/${targetUserId}`, async (route) => {
      const request = route.request();

      if (request.method() === "PATCH") {
        mutationHeader = request.headers()["x-requested-with"];
        await route.fulfill({
          body: JSON.stringify({
            error: {
              code: "SUPERADMIN_REQUIRED",
              message: "Superadmin access required.",
              requestId: "req_admin_plan_403",
            },
            success: false,
          }),
          contentType: "application/json",
          status: 403,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          data: {
            avatarUrl: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            deletedAt: null,
            email: "customer@example.com",
            emailVerified: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            id: targetUserId,
            linkCount: 2,
            name: "Customer Example",
            plan: "FREE",
            role: "user",
            subscriptionPlan: null,
            subscriptionStatus: null,
            totalClicks: 42,
            twoFactorEnabled: false,
          },
          success: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto(`/admin/users/${targetUserId}`);
    await expect(page.getByText("customer@example.com")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Change Plan" }).first().click();
    await page.locator('[data-slot="dialog-content"] [data-slot="select-trigger"]').click();
    await page.getByRole("option", { name: "Pro" }).click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole("button", { name: "Change Plan" })
      .click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(
      dialog.getByText("Your admin session is no longer authorized. Sign in again."),
    ).toBeVisible({ timeout: 10_000 });
    await expect(dialog.getByText("Request ID: req_admin_plan_403")).toBeVisible();

    expect(mutationHeader).toBe("XMLHttpRequest");
    expect(pageErrors).toEqual([]);
  });

  test("admin plan update succeeds and suspend confirmation protects the action", async ({
    page,
  }) => {
    const targetUserId = "e2e-admin-success-user";
    const pageErrors: string[] = [];
    let currentPlan = "FREE";
    let deletedAt: string | null = null;
    let planMutationHeader: string | undefined;
    let suspendMutationHeader: string | undefined;
    let suspendCalls = 0;

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await authenticateAsSuperadmin(page);
    await page.route(`**/api/v1/admin/users/${targetUserId}`, async (route) => {
      const request = route.request();

      if (request.method() === "PATCH") {
        const payload = request.postDataJSON() as { plan: string };
        planMutationHeader = request.headers()["x-requested-with"];
        currentPlan = payload.plan;
        await route.fulfill({
          body: JSON.stringify({
            data: { plan: currentPlan, previousPlan: "FREE" },
            success: true,
          }),
          contentType: "application/json",
          status: 200,
        });
        return;
      }

      if (request.method() === "POST") {
        const payload = request.postDataJSON() as { action: string };
        suspendMutationHeader = request.headers()["x-requested-with"];
        suspendCalls += 1;
        deletedAt =
          payload.action === "suspend"
            ? new Date("2026-01-02T00:00:00.000Z").toISOString()
            : null;
        await route.fulfill({
          body: JSON.stringify({
            data: { action: payload.action },
            success: true,
          }),
          contentType: "application/json",
          status: 200,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          data: {
            avatarUrl: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            deletedAt,
            email: "success-customer@example.com",
            emailVerified: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            id: targetUserId,
            linkCount: 8,
            name: "Success Customer",
            plan: currentPlan,
            role: "user",
            subscriptionPlan: null,
            subscriptionStatus: null,
            totalClicks: 180,
            twoFactorEnabled: false,
          },
          success: true,
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto(`/admin/users/${targetUserId}`);
    await expect(page.getByText("success-customer@example.com")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("button", { name: "Change Plan" }).first().click();
    await page.locator('[data-slot="dialog-content"] [data-slot="select-trigger"]').click();
    await page.getByRole("option", { name: "Pro" }).click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole("button", { name: "Change Plan" })
      .click();

    await expect(page.locator('[data-slot="dialog-content"]')).toBeHidden({
      timeout: 10_000,
    });
    await expect(page.getByText("PRO", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Suspend User" }).click();
    await expect(page.getByRole("heading", { name: "Suspend this user?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Suspend this user?" })).toBeHidden();
    expect(suspendCalls).toBe(0);

    await page.getByRole("button", { name: "Suspend User" }).click();
    await page
      .locator('[data-slot="dialog-content"]')
      .getByRole("button", { name: "Suspend User" })
      .click();

    await expect(page.getByRole("button", { name: "Unsuspend User" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Suspended", { exact: true })).toBeVisible();

    expect(planMutationHeader).toBe("XMLHttpRequest");
    expect(suspendMutationHeader).toBe("XMLHttpRequest");
    expect(suspendCalls).toBe(1);
    expect(pageErrors).toEqual([]);
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
