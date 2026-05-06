import { Link2, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

export default function PublicSlugNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
          <Link2 className="size-5" />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">
          This link doesn&apos;t exist or has been removed
        </h1>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href="/register" size="sm">
            <Plus className="size-4" />
            Create link
          </ButtonLink>
          <ButtonLink href="/" size="sm" variant="outline">
            Back home
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
