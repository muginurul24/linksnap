import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardBreadcrumbs } from "../../src/components/dashboard/dashboard-breadcrumbs";

describe("DashboardBreadcrumbs", () => {
  it("should render linked ancestors and the current page label", () => {
    const markup = renderToStaticMarkup(
      <DashboardBreadcrumbs
        items={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/links", label: "My Links" },
          { label: "/spring-sale" },
        ]}
      />,
    );

    expect(markup).toContain('aria-label="breadcrumb"');
    expect(markup).toContain('href="/dashboard"');
    expect(markup).toContain('href="/links"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain("/spring-sale");
  });
});
