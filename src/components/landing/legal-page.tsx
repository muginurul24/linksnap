import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export type LegalSection = {
  bullets?: string[];
  paragraphs: string[];
  title: string;
};

type LegalPageProps = {
  description: string;
  sections: LegalSection[];
  title: string;
  updatedAt: string;
};

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

function LegalHeader() {
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
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-foreground">
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

export function LegalPage({
  description,
  sections,
  title,
  updatedAt,
}: LegalPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <LegalHeader />
      <article>
        <section className="border-b bg-muted/30 py-12 sm:py-16">
          <Container>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Home
            </Link>
            <p className="mt-8 text-sm font-medium text-muted-foreground">
              Last updated: {updatedAt}
            </p>
            <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {description}
            </p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-base leading-8 text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="space-y-2 pl-5 text-muted-foreground">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc leading-7">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </Container>
      </article>
      <MarketingFooter />
    </main>
  );
}
