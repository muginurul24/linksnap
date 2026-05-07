import { describe, expect, it } from "vitest";
import {
  isBlogSlug,
  parseBlogPost,
  parseBlogPostDocument,
  parseMdxBlocks,
} from "../../src/lib/blog/posts";

describe("blog post parsing", () => {
  it("should parse summary metadata when frontmatter is valid", () => {
    const post = parseBlogPost(
      `---
title: "Smart Redirect Rules"
excerpt: "Route visitors by context."
category: "Growth"
publishedAt: "2026-05-07"
readingTime: "5 min read"
---

# Smart Redirect Rules
`,
      "smart-redirect-rules",
    );

    expect(post).toEqual({
      slug: "smart-redirect-rules",
      title: "Smart Redirect Rules",
      excerpt: "Route visitors by context.",
      category: "Growth",
      publishedAt: "2026-05-07",
      readingTime: "5 min read",
    });
  });

  it("should throw when required frontmatter is missing", () => {
    expect(() =>
      parseBlogPost(
        `---
title: "Missing Excerpt"
category: "Growth"
publishedAt: "2026-05-07"
readingTime: "5 min read"
---
`,
        "missing-excerpt",
      ),
    ).toThrow('Blog post "missing-excerpt" is missing "excerpt" frontmatter.');
  });

  it("should parse MDX content blocks for article rendering", () => {
    const blocks = parseMdxBlocks(`# Heading

This paragraph spans
two lines.

## Section

- First item
- Second item

\`\`\`ts
const value = "linksnap";
\`\`\`
`);

    expect(blocks).toEqual([
      { depth: 1, text: "Heading", type: "heading" },
      { text: "This paragraph spans two lines.", type: "paragraph" },
      { depth: 2, text: "Section", type: "heading" },
      { items: ["First item", "Second item"], type: "list" },
      { code: 'const value = "linksnap";', language: "ts", type: "code" },
    ]);
  });

  it("should parse a complete blog post document with blocks", () => {
    const post = parseBlogPostDocument(
      `---
title: "MDX Rendering"
excerpt: "Render safely."
category: "Engineering"
publishedAt: "2026-05-07"
readingTime: "4 min read"
---

# MDX Rendering

Render content as JSX.
`,
      "mdx-rendering",
    );

    expect(post.blocks).toEqual([
      { depth: 1, text: "MDX Rendering", type: "heading" },
      { text: "Render content as JSX.", type: "paragraph" },
    ]);
    expect(post.title).toBe("MDX Rendering");
  });

  it("should reject unsafe blog slugs", () => {
    expect(isBlogSlug("smart-redirect-rules-marketing-hack")).toBe(true);
    expect(isBlogSlug("../secrets")).toBe(false);
    expect(isBlogSlug("SmartRedirect")).toBe(false);
  });
});
