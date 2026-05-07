import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src/content/blog");
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;
const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: string;
};

export type BlogContentBlock =
  | {
      depth: 1 | 2 | 3;
      text: string;
      type: "heading";
    }
  | {
      items: string[];
      type: "list";
    }
  | {
      text: string;
      type: "paragraph";
    }
  | {
      code: string;
      language: string | null;
      type: "code";
    };

export type BlogPost = BlogPostSummary & {
  blocks: BlogContentBlock[];
};

type BlogFrontmatter = Omit<BlogPostSummary, "slug">;

export async function getBlogPosts(): Promise<BlogPostSummary[]> {
  const entries = await readdir(BLOG_CONTENT_DIR, { withFileTypes: true });
  const posts = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx"))
      .map(async (entry) => {
        const slug = entry.name.replace(/\.mdx$/, "");
        const filePath = path.join(BLOG_CONTENT_DIR, entry.name);
        const rawContent = await readFile(filePath, "utf8");

        return parseBlogPost(rawContent, slug);
      }),
  );

  return posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

export async function getBlogPostSlugs(): Promise<string[]> {
  const posts = await getBlogPosts();

  return posts.map((post) => post.slug);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!isBlogSlug(slug)) return null;

  try {
    const rawContent = await readFile(
      path.join(BLOG_CONTENT_DIR, `${slug}.mdx`),
      "utf8",
    );

    return parseBlogPostDocument(rawContent, slug);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;

    throw error;
  }
}

export function parseBlogPost(
  rawContent: string,
  slug: string,
): BlogPostSummary {
  const post = parseBlogPostDocument(rawContent, slug);

  return {
    category: post.category,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    slug: post.slug,
    title: post.title,
  };
}

export function parseBlogPostDocument(rawContent: string, slug: string): BlogPost {
  const match = rawContent.match(FRONTMATTER_PATTERN);

  const frontmatter = match?.[1];

  if (!frontmatter) {
    throw new Error(`Blog post "${slug}" is missing frontmatter.`);
  }

  const body = rawContent.slice(match[0].length);

  return {
    blocks: parseMdxBlocks(body),
    slug,
    ...parseFrontmatter(frontmatter, slug),
  };
}

export function parseMdxBlocks(rawBody: string): BlogContentBlock[] {
  const blocks: BlogContentBlock[] = [];
  const lines = rawBody.replace(/\r\n/g, "\n").split("\n");
  let codeLines: string[] | null = null;
  let codeLanguage: string | null = null;
  let listItems: string[] = [];
  let paragraphLines: string[] = [];

  function flushCode(): void {
    if (!codeLines) return;

    blocks.push({
      code: codeLines.join("\n"),
      language: codeLanguage,
      type: "code",
    });
    codeLines = null;
    codeLanguage = null;
  }

  function flushList(): void {
    if (listItems.length === 0) return;

    blocks.push({ items: listItems, type: "list" });
    listItems = [];
  }

  function flushParagraph(): void {
    if (paragraphLines.length === 0) return;

    blocks.push({
      text: paragraphLines.join(" "),
      type: "paragraph",
    });
    paragraphLines = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (codeLines) {
      if (trimmed.startsWith("```")) {
        flushCode();
        continue;
      }

      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      codeLines = [];
      codeLanguage = trimmed.slice(3).trim() || null;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({
        depth: heading[1].length as 1 | 2 | 3,
        text: heading[2],
        type: "heading",
      });
      continue;
    }

    const listItem = trimmed.match(/^-\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1]);
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushCode();
  flushParagraph();
  flushList();

  return blocks;
}

export function isBlogSlug(value: string): boolean {
  return BLOG_SLUG_PATTERN.test(value);
}

function parseFrontmatter(frontmatter: string, slug: string): BlogFrontmatter {
  const values = frontmatter
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        throw new Error(`Invalid frontmatter line in "${slug}": ${line}`);
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      acc[key] = stripQuotes(value);

      return acc;
    }, {});

  return {
    title: requireFrontmatterValue(values, "title", slug),
    excerpt: requireFrontmatterValue(values, "excerpt", slug),
    category: requireFrontmatterValue(values, "category", slug),
    publishedAt: requireFrontmatterValue(values, "publishedAt", slug),
    readingTime: requireFrontmatterValue(values, "readingTime", slug),
  };
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function requireFrontmatterValue(
  values: Record<string, string>,
  key: keyof BlogFrontmatter,
  slug: string,
): string {
  const value = values[key];

  if (!value) {
    throw new Error(`Blog post "${slug}" is missing "${key}" frontmatter.`);
  }

  return value;
}
