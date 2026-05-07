import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackNavigationLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link
      className="inline-flex w-fit items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      href={href}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
