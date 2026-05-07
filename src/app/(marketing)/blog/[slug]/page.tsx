import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Zap } from "lucide-react";
import {
  getBlogPostBySlug,
  getBlogPostSlugs,
  type BlogContentBlock,
} from "@/lib/blog/posts";
import {
  buildBlogPostJsonLd,
  createPublicMetadata,
  serializeJsonLd,
} from "@/lib/seo/metadata";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-4xl px-5 sm:px-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Header() {
  return (
    <header className="border-b bg-background/95">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <Zap className="size-4" />
          </span>
          LinkSnap
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/blog" className="font-medium text-foreground">
            Blog
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
        </nav>
      </Container>
    </header>
  );
}

function renderBlock(block: BlogContentBlock, index: number) {
  if (block.type === "heading") {
    const className =
      block.depth === 1
        ? "text-3xl font-semibold"
        : block.depth === 2
          ? "text-2xl font-semibold"
          : "text-xl font-semibold";

    if (block.depth === 1) {
      return (
        <h2 key={index} className={className}>
          {block.text}
        </h2>
      );
    }

    if (block.depth === 2) {
      return (
        <h2 key={index} className={className}>
          {block.text}
        </h2>
      );
    }

    return (
      <h3 key={index} className={className}>
        {block.text}
      </h3>
    );
  }

  if (block.type === "list") {
    return (
      <ul key={index} className="space-y-2 pl-5 text-muted-foreground">
        {block.items.map((item) => (
          <li key={item} className="list-disc leading-7">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "code") {
    return (
      <pre
        key={index}
        className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6"
      >
        <code>{block.code}</code>
      </pre>
    );
  }

  return (
    <p key={index} className="text-base leading-8 text-muted-foreground">
      {block.text}
    </p>
  );
}

export async function generateStaticParams() {
  const slugs = await getBlogPostSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return createPublicMetadata({
      title: "Article not found",
      description: "This LinkSnap blog article could not be found.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const metadata = createPublicMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
  });

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      description: post.excerpt,
      publishedTime: new Date(post.publishedAt).toISOString(),
      title: `${post.title} | LinkSnap`,
      type: "article",
      url: `/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) notFound();

  const articleBlocks = post.blocks.filter(
    (block, index) =>
      !(index === 0 && block.type === "heading" && block.depth === 1),
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json">
        {serializeJsonLd(buildBlogPostJsonLd(post))}
      </script>
      <Header />
      <article>
        <section className="border-b bg-muted/30 py-12 sm:py-16">
          <Container>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Blog
            </Link>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 font-semibold text-emerald-400">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {formatDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" />
                {post.readingTime}
              </span>
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
              {post.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {post.excerpt}
            </p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          <div className="space-y-7">{articleBlocks.map(renderBlock)}</div>
        </Container>
      </article>
    </main>
  );
}
