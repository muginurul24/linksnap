import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { auth } from "@/lib/auth";
import { CampaignForm } from "../campaign-form";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export default async function NewCampaignPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/campaigns/new");

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Define campaign metadata and UTM defaults.
          </p>
        </div>
        <ButtonLink href="/campaigns" size="sm" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </ButtonLink>
      </div>

      <CampaignForm />
    </>
  );
}
