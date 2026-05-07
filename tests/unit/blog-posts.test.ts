import { describe, expect, it } from "vitest";
import { parseBlogPost } from "../../src/lib/blog/posts";

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
});
