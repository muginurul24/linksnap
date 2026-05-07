import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BackNavigationLink } from "../../src/components/dashboard/back-navigation-link";

describe("BackNavigationLink", () => {
  it("should render a Back to Links text link", () => {
    const markup = renderToStaticMarkup(
      <BackNavigationLink href="/links">Back to Links</BackNavigationLink>,
    );

    expect(markup).toContain('href="/links"');
    expect(markup).toContain("Back to Links");
    expect(markup).toContain("text-sm");
  });

  it("should render a Back to Campaigns text link", () => {
    const markup = renderToStaticMarkup(
      <BackNavigationLink href="/campaigns">
        Back to Campaigns
      </BackNavigationLink>,
    );

    expect(markup).toContain('href="/campaigns"');
    expect(markup).toContain("Back to Campaigns");
    expect(markup).toContain("text-sm");
  });
});
