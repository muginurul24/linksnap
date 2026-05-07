"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global_error_boundary", {
      digest: error.digest,
      name: error.name,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
          <section className="w-full max-w-lg text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-md bg-destructive/15 text-destructive">
              <AlertTriangle className="size-6" />
            </div>
            <p className="mt-6 text-sm font-semibold uppercase text-emerald-400">
              LinkSnap
            </p>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Something went wrong.
            </h1>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">
              A critical error occurred. Try again, or return to the home page.
            </p>
            {error.digest ? (
              <p className="mt-4 rounded-md border bg-muted/40 px-3 py-2 font-[ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation_Mono','Courier_New',monospace] text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" onClick={() => reset()}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
              <Button variant="outline" render={<Link href="/" />}>
                <Home className="size-4" />
                Go home
              </Button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
