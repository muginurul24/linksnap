import { redirect } from "next/navigation";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import { CampaignForm } from "../campaign-form";

export default async function NewCampaignPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/campaigns/new");

  return (
    <>
      <div className="space-y-3">
        <BackNavigationLink href="/campaigns">
          Back to Campaigns
        </BackNavigationLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Define campaign metadata and UTM defaults.
          </p>
        </div>
      </div>

      <CampaignForm />
    </>
  );
}
