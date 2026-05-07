import { describe, expect, it } from "vitest";
import { getDashboardBreadcrumbs } from "../../src/components/dashboard/app-header";
import {
  buildLinksSearchHref,
  getLinksSearchQuery,
  LINKS_SEARCH_DEBOUNCE_MS,
  LINKS_SEARCH_MAX_LENGTH,
  shouldNavigateLinksSearch,
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

  it("should render API docs breadcrumbs", () => {
    expect(getDashboardBreadcrumbs("/docs")).toEqual([
      { href: "/dashboard", label: "Dashboard" },
      { label: "API Docs" },
    ]);
  });

  it("should build a filtered links search href when query is provided", () => {
    expect(buildLinksSearchHref(" promo code ")).toBe(
      "/links?search=promo+code",
    );
  });

  it("should use a 300ms debounce for dashboard search input", () => {
    expect(LINKS_SEARCH_DEBOUNCE_MS).toBe(300);
  });

  it("should build an unfiltered links href when query is empty", () => {
    expect(buildLinksSearchHref("   ")).toBe("/links");
  });

  it("should ignore links search queries over the maximum length", () => {
    const tooLong = "a".repeat(LINKS_SEARCH_MAX_LENGTH + 1);

    expect(getLinksSearchQuery(tooLong)).toBeUndefined();
    expect(buildLinksSearchHref(tooLong)).toBe("/links");
  });

  it("should skip search navigation when the normalized href is unchanged", () => {
    expect(shouldNavigateLinksSearch("/links?search=promo+code", " promo code ")).toBe(
      false,
    );
  });

  it("should request search navigation when the normalized href changes", () => {
    expect(shouldNavigateLinksSearch("/links?search=old", "new")).toBe(true);
  });
});
