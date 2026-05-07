import { Link2 } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground">
        <Link2 className="size-4 animate-pulse text-emerald-400" />
        Opening link...
      </div>
    </main>
  );
}
