import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Link</h1>
          <p className="text-sm text-muted-foreground">
            Shorten a destination and prepare optional routing settings.
          </p>
        </div>
        <ButtonLink href="/links" size="sm" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </ButtonLink>
      </div>

      <CreateLinkForm userPlan={userPlan} />
    </>
  );
}
