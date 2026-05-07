import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicPages = ["/", "/pricing", "/blog", "/register"] as const;

test("should navigate landing pricing demo generator and register", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "LinkSnap" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Pricing" }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await page.getByRole("button", { name: "yearly" }).click();
  await expect(page.getByText("$75", { exact: true })).toBeVisible();
  await expect(page.getByText("$180", { exact: true })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: "Try Demo" }).click();
  await expect(page).toHaveURL(/\/#demo$/);
  await page
    .getByLabel("Destination URL")
    .fill("https://example.com/sale?utm_source=e2e");
  await page.getByRole("button", { name: "Generate" }).click();
  await expect(page.getByText(/https:\/\/linksnap\.id\/example-/)).toBeVisible();

  await page.getByRole("link", { name: "Get Started Free" }).first().click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByText("Create account").first()).toBeVisible();
});

for (const route of publicPages) {
  test(`should pass WCAG 2.1 AA checks on ${route}`, async ({ page }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
