import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-muted/30 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-8 h-4 w-40" />
          <Skeleton className="mt-5 h-12 w-full max-w-3xl" />
          <Skeleton className="mt-4 h-5 w-full max-w-2xl" />
        </div>
      </section>
      <section className="py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl space-y-4 px-5 sm:px-6">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-10/12" />
          <Skeleton className="mt-8 h-8 w-72" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-9/12" />
        </div>
      </section>
    </main>
  );
}
