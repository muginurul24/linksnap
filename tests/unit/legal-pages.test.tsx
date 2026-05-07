import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BlogPage from "../../src/app/(marketing)/blog/page";
import PrivacyPage from "../../src/app/(marketing)/privacy/page";
import TermsPage from "../../src/app/(marketing)/terms/page";
import LandingPage from "../../src/components/landing/landing-page";

describe("legal pages", () => {
  it("should render terms of service content", () => {
    const markup = renderToStaticMarkup(<TermsPage />);

    expect(markup).toContain("Terms of Service");
    expect(markup).toContain("Using LinkSnap");
    expect(markup).toContain("support@justqiu.cloud");
  });

  it("should render privacy policy content", () => {
    const markup = renderToStaticMarkup(<PrivacyPage />);

    expect(markup).toContain("Privacy Policy");
    expect(markup).toContain("Information we collect");
    expect(markup).toContain("Midtrans");
    expect(markup).toContain("Resend");
  });

  it("should expose legal links from the marketing footer", async () => {
    const landingMarkup = renderToStaticMarkup(<LandingPage />);
    const blogMarkup = renderToStaticMarkup(await BlogPage());

    expect(landingMarkup).toContain('href="/terms"');
    expect(landingMarkup).toContain('href="/privacy"');
    expect(blogMarkup).toContain('href="/terms"');
    expect(blogMarkup).toContain('href="/privacy"');
  });
});
