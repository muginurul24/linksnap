import { redirect } from "next/navigation";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { auth } from "@/lib/auth";
import { findBillingUserById } from "@/lib/db/queries/payments";
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

  const billingUser = await findBillingUserById(userId);
  const userPlan = billingUser?.plan ?? "FREE";

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

      <CreateLinkForm userPlan={userPlan} />
    </>
  );
}
