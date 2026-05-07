import { redirect } from "next/navigation";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { auth } from "@/lib/auth";
import { countLinkPagesByUserId } from "@/lib/db/queries/links";
import { CreateLinkForm } from "../link-form";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export default async function NewLinkPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/links/new");

  const linkPageCount = await countLinkPagesByUserId(userId);

  return (
    <>
      <div className="space-y-3">
        <BackNavigationLink href="/links">Back to Links</BackNavigationLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Link</h1>
          <p className="text-sm text-muted-foreground">
            Shorten a destination and prepare optional routing settings.
          </p>
        </div>
      </div>

      <CreateLinkForm linkPageCount={linkPageCount} />
    </>
  );
}
