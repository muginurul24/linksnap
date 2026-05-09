import { notFound, redirect } from "next/navigation";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import { findCampaignById } from "@/lib/db/queries/campaigns";
import { campaignIdParamsSchema } from "@/lib/validations/campaign";
import {
  CampaignForm,
  type EditableCampaignInitialData,
} from "@/app/(dashboard)/campaigns/campaign-form";

type EditCampaignPageProps = {
  params: Promise<{ id: string }>;
};

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
      <div className="space-y-3">
        <DashboardBreadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/campaigns", label: "Campaigns" },
            { href: `/campaigns/${initialCampaign.id}`, label: initialCampaign.name },
            { label: "Edit" },
          ]}
        />
        <BackNavigationLink href="/campaigns">
          Back to Campaigns
        </BackNavigationLink>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Update campaign metadata and UTM defaults.
          </p>
        </div>
      </div>

      <CampaignForm initialCampaign={initialCampaign} />
    </>
  );
}
