import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Clock, Zap } from "lucide-react";
import { getBlogPosts, type BlogPostSummary } from "@/lib/blog/posts";

const title = "Blog - LinkSnap";
const description =
  "Practical guides for short links, Link Pages, smart redirects, QR campaigns, and conversion-focused link analytics.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    type: "website",
    url: "/blog",
    title,
    description,
    siteName: "LinkSnap",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "LinkSnap campaign dashboard preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

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
    <div className={`mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8 ${className ?? ""}`}>
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

function BlogCard({ post, featured }: { post: BlogPostSummary; featured?: boolean }) {
  return (
    <article
      id={post.slug}
      className={`rounded-md border bg-card p-6 shadow-sm ${
        featured ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
      <h2 className={`${featured ? "text-3xl" : "text-2xl"} mt-5 font-semibold`}>
        {post.title}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {post.excerpt}
      </p>
      <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
        <BookOpen className="size-4" />
        Launch article
      </div>
    </article>
  );
}

function buildStructuredData(posts: BlogPostSummary[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "LinkSnap blog",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://linksnap.id/blog#${post.slug}`,
      name: post.title,
      description: post.excerpt,
    })),
  };
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const [featuredPost, ...secondaryPosts] = posts;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json">
        {serializeJsonLd(buildStructuredData(posts))}
      </script>
      <Header />
      <section className="py-18 sm:py-24">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-lg border bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              <BookOpen className="size-4 text-emerald-400" />
              LinkSnap blog
            </p>
            <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">
              Practical link marketing playbooks
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">
              Guides for turning short links, Link Pages, QR codes, and smart
              redirect rules into measurable campaign infrastructure.
            </p>
          </div>
        </Container>
      </section>

      <section className="pb-20 sm:pb-24">
        <Container>
          {featuredPost ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <BlogCard post={featuredPost} featured />
              <div className="grid gap-4">
                {secondaryPosts.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-card p-8 text-center">
              <h2 className="text-2xl font-semibold">No articles yet</h2>
              <p className="mt-3 text-muted-foreground">
                Blog content will appear here once MDX posts are added.
              </p>
            </div>
          )}
        </Container>
      </section>

      <section className="border-y bg-muted/40 py-14">
        <Container className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Put the playbooks to work.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Build short links, QR codes, Link Pages, and campaign analytics in
              one workspace.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-semibold text-[#07100c] transition hover:bg-emerald-300"
          >
            Get Started Free
            <ArrowRight className="size-4" />
          </Link>
        </Container>
      </section>
    </main>
  );
}
