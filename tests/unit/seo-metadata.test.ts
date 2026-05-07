import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  buildHomeJsonLd,
  createPublicMetadata,
  noIndexRobots,
  serializeJsonLd,
  siteConfig,
} from "@/lib/seo/metadata";

describe("SEO metadata helpers", () => {
  it("should create indexable public metadata with canonical and social tags", () => {
    const metadata = createPublicMetadata({
      title: "Pricing",
      description: "Plan comparison.",
      path: "/pricing",
    });

    expect(metadata.title).toBe("Pricing");
    expect(metadata.alternates?.canonical).toBe("/pricing");
    expect(metadata.openGraph).toMatchObject({
      title: "Pricing | LinkSnap",
      url: "/pricing",
      siteName: "LinkSnap",
    });
    expect(metadata.robots).not.toBe(noIndexRobots);
  });

  it("should noindex auth and redirect surfaces when requested", () => {
    const metadata = createPublicMetadata({
      title: "Sign in",
      description: "Authentication page.",
      path: "/login",
      noIndex: true,
    });

    expect(metadata.robots).toBe(noIndexRobots);
  });

  it("should serialize JSON-LD without raw HTML tag openers", () => {
    const serialized = serializeJsonLd({ name: "<script>alert(1)</script>" });

    expect(serialized).not.toContain("<script");
    expect(serialized).toContain("\\u003cscript");
  });

  it("should describe LinkSnap as an organization and web application", () => {
    const jsonLd = buildHomeJsonLd();

    expect(jsonLd["@graph"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "@type": "Organization",
          name: siteConfig.name,
        }),
        expect.objectContaining({
          "@type": "WebApplication",
          applicationCategory: "MarketingApplication",
        }),
      ]),
    );
  });
});

describe("SEO metadata routes", () => {
  it("should include only canonical marketing pages in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toEqual([
      "https://www.justqiu.cloud/",
      "https://www.justqiu.cloud/pricing",
      "https://www.justqiu.cloud/blog",
      "https://www.justqiu.cloud/terms",
      "https://www.justqiu.cloud/privacy",
    ]);
    expect(urls).not.toContain("https://www.justqiu.cloud/login");
  });

  it("should disallow private app, API, and auth surfaces in robots", () => {
    const generatedRobots = robots();

    expect(generatedRobots.sitemap).toBe("https://www.justqiu.cloud/sitemap.xml");
    expect(generatedRobots.host).toBe(siteConfig.url);
    expect(generatedRobots.rules).toMatchObject({
      userAgent: "*",
      allow: "/",
      disallow: expect.arrayContaining([
        "/api",
        "/links",
        "/analytics",
        "/settings",
        "/login",
        "/register",
        "/verify",
      ]),
    });
  });
});
