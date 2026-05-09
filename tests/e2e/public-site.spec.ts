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

  await expect(page.getByRole("link", { name: "Pricing" }).first()).toHaveAttribute(
    "href",
    "/pricing",
  );
  await page.goto("/pricing");
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
  await expect(
    page.getByText(/^https:\/\/www\.justqiu\.cloud\/example-[a-z0-9]+$/),
  ).toBeVisible();

  const pricingSection = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Start free, upgrade when campaigns need more room",
    }),
  });
  const pricingCta = pricingSection
    .getByRole("link", { name: "Get Started Free" })
    .first();
  await expect(pricingCta).toHaveAttribute("href", "/register");
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register$/, { timeout: 15_000 });
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
