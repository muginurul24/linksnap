import { describe, expect, it } from "vitest";
import { getDashboardBreadcrumbs } from "../../src/components/dashboard/app-header";
import {
  buildLinksSearchHref,
  getLinksSearchQuery,
  LINKS_SEARCH_MAX_LENGTH,
} from "../../src/lib/links/search";

describe("dashboard app header", () => {
  it("should link dashboard breadcrumb items to the dashboard route", () => {
    expect(getDashboardBreadcrumbs("/settings/billing")).toEqual([
      { href: "/dashboard", label: "Dashboard" },
      { href: "/settings", label: "Settings" },
      { label: "Billing" },
    ]);
  });

  it("should render a dashboard fallback breadcrumb when route is unknown", () => {
    expect(getDashboardBreadcrumbs("/unknown")).toEqual([{ label: "Dashboard" }]);
  });

  it("should build a filtered links search href when query is provided", () => {
    expect(buildLinksSearchHref(" promo code ")).toBe(
      "/links?search=promo+code",
    );
  });

  it("should build an unfiltered links href when query is empty", () => {
    expect(buildLinksSearchHref("   ")).toBe("/links");
  });

  it("should ignore links search queries over the maximum length", () => {
    const tooLong = "a".repeat(LINKS_SEARCH_MAX_LENGTH + 1);

    expect(getLinksSearchQuery(tooLong)).toBeUndefined();
    expect(buildLinksSearchHref(tooLong)).toBe("/links");
  });
});
