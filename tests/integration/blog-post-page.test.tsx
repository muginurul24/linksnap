import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BlogPostPage, {
  generateMetadata,
  generateStaticParams,
} from "../../src/app/(marketing)/blog/[slug]/page";

describe("blog post page", () => {
  it("should render a blog article from MDX content", async () => {
    const element = await BlogPostPage({
      params: Promise.resolve({ slug: "short-links-costing-conversions" }),
    });

    const markup = renderToStaticMarkup(element);

    expect(markup).toContain("Why Your Short Links Are Costing You Conversions");
    expect(markup).toContain('href="/blog"');
    expect(markup).toContain("The trust gap");
    expect(markup).toContain("Use consistent slugs for recognizable campaigns.");
    expect(markup).not.toContain("dangerouslySetInnerHTML");
  });

  it("should generate article metadata from frontmatter", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "smart-redirect-rules-marketing-hack" }),
    });

    expect(metadata.title).toBe("Smart Redirect Rules: The Marketing Hack Nobody Uses");
    expect(metadata.description).toBe(
      "One short link can send each visitor to the right destination based on country, device, or campaign timing.",
    );
    expect(metadata.alternates?.canonical).toBe(
      "/blog/smart-redirect-rules-marketing-hack",
    );
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      url: "/blog/smart-redirect-rules-marketing-hack",
    });
  });

  it("should statically enumerate MDX blog slugs", async () => {
    await expect(generateStaticParams()).resolves.toEqual(
      expect.arrayContaining([
        { slug: "short-links-costing-conversions" },
        { slug: "smart-redirect-rules-marketing-hack" },
        { slug: "link-pages-click-through-rate" },
      ]),
    );
  });
});
