import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const BLOG_CONTENT_DIR = path.join(process.cwd(), "src/content/blog");
const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: string;
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

export function parseBlogPost(
  rawContent: string,
  slug: string,
): BlogPostSummary {
  const match = rawContent.match(FRONTMATTER_PATTERN);

  const frontmatter = match?.[1];

  if (!frontmatter) {
    throw new Error(`Blog post "${slug}" is missing frontmatter.`);
  }

  return {
    slug,
    ...parseFrontmatter(frontmatter, slug),
  };
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
