import Link from "next/link";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
      <section className="w-full max-w-lg text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <SearchX className="size-6" />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase text-emerald-400">
          LinkSnap
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Page not found.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
          This page may have moved, expired, or never existed. Check the URL or
          return to LinkSnap.
        </p>
        <div className="mt-8">
          <Button render={<Link href="/" />}>
            <Home className="size-4" />
            Go home
          </Button>
        </div>
      </section>
    </main>
  );
}
