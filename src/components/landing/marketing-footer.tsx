import Link from "next/link";
import { Zap } from "lucide-react";

type MarketingFooterProps = {
  className?: string;
};

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

export function MarketingFooter({ className }: MarketingFooterProps) {
  return (
    <footer className={`border-t bg-background py-10 ${className ?? ""}`}>
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-foreground text-background">
            <Zap className="size-4" />
          </span>
          LinkSnap
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/#demo" className="hover:text-foreground">
            Demo
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Sign In
          </Link>
        </nav>
      </Container>
    </footer>
  );
}
