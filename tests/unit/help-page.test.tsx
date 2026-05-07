import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HelpPage from "../../src/app/(dashboard)/help/page";

describe("help page", () => {
  it("should render FAQ and contact support sections", () => {
    const markup = renderToStaticMarkup(<HelpPage />);

    expect(markup).toContain("Help");
    expect(markup).toContain("How do plan limits work?");
    expect(markup).toContain("Contact Support");
    expect(markup).toContain("mailto:support@justqiu.cloud");
    expect(markup).toContain("Security Reports");
  });
});
