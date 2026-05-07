import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-muted/30 py-20">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-11 w-full max-w-2xl" />
          <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
        </div>
      </section>
      <section className="py-12">
        <div className="mx-auto grid w-full max-w-5xl gap-4 px-5 sm:px-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="rounded-md border bg-card p-6">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-4 h-7 w-full max-w-xl" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
