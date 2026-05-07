import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { auth } from "@/lib/auth";
import { findCampaignById } from "@/lib/db/queries/campaigns";
import { campaignIdParamsSchema } from "@/lib/validations/campaign";
import {
  CampaignForm,
  type EditableCampaignInitialData,
} from "../../campaign-form";

type EditCampaignPageProps = {
  params: Promise<{ id: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function toInitialCampaign(
  campaign: Awaited<ReturnType<typeof findCampaignById>>,
  userId: string,
): EditableCampaignInitialData {
  if (!campaign) notFound();
  if (campaign.userId !== userId) notFound();

  return {
    description: campaign.description,
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    utmCampaign: campaign.utmCampaign,
    utmContent: campaign.utmContent,
    utmMedium: campaign.utmMedium,
    utmSource: campaign.utmSource,
    utmTerm: campaign.utmTerm,
  };
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const parsedParams = campaignIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();

  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) {
    redirect(`/login?callbackUrl=/campaigns/${parsedParams.data.id}/edit`);
  }

  const campaign = await findCampaignById(parsedParams.data.id);
  const initialCampaign = toInitialCampaign(campaign, userId);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Update campaign metadata and UTM defaults.
          </p>
        </div>
        <ButtonLink href="/campaigns" size="sm" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </ButtonLink>
      </div>

      <CampaignForm initialCampaign={initialCampaign} />
    </>
  );
}
