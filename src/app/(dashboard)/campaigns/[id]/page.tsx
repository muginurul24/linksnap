import { notFound, redirect } from "next/navigation";
import { BarChart3, Pencil } from "lucide-react";
import { BackNavigationLink } from "@/components/dashboard/back-navigation-link";
import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  findCampaignById,
  listCampaignsByUserId,
} from "@/lib/db/queries/campaigns";
import { campaignIdParamsSchema } from "@/lib/validations/campaign";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail-client";

type CampaignDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CampaignDetailPage({
  params,
}: CampaignDetailPageProps) {
  const parsedParams = campaignIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) notFound();

  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) {
    redirect(`/login?callbackUrl=/campaigns/${parsedParams.data.id}`);
  }

  const [campaign, campaignList] = await Promise.all([
    findCampaignById(parsedParams.data.id),
    listCampaignsByUserId({
      limit: 50,
      page: 1,
      userId,
    }),
  ]);

  if (!campaign || campaign.userId !== userId) notFound();

  const comparisonCampaigns = campaignList.items
    .filter((item) => item.id !== campaign.id)
    .map((item) => ({
      id: item.id,
      linkCount: item.linkCount,
      name: item.name,
      slug: item.slug,
    }));
  const status = campaign.linkCount > 0 ? "Live" : "Setup";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <DashboardBreadcrumbs
          items={[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/campaigns", label: "Campaigns" },
            { label: campaign.name },
          ]}
        />
        <BackNavigationLink href="/campaigns">Back to Campaigns</BackNavigationLink>
        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-chart-2/10 text-chart-2">
                  <BarChart3 className="size-5" />
                </div>
                <Badge variant={campaign.linkCount > 0 ? "default" : "secondary"}>
                  {status}
                </Badge>
              </div>
              <div>
                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {campaign.name}
                </h1>
                <p className="font-mono text-sm text-muted-foreground">
                  /{campaign.slug}
                </p>
              </div>
              {campaign.description ? (
                <p className="max-w-3xl text-sm text-muted-foreground">
                  {campaign.description}
                </p>
              ) : null}
            </div>
            <ButtonLink
              className="w-full sm:w-auto"
              href={`/campaigns/${campaign.id}/edit`}
              size="sm"
              variant="outline"
            >
              <Pencil className="size-4" />
              Edit
            </ButtonLink>
          </CardContent>
        </Card>
      </div>

      <CampaignDetailClient
        campaign={{
          id: campaign.id,
          linkCount: campaign.linkCount,
          name: campaign.name,
          slug: campaign.slug,
        }}
        comparisonCampaigns={comparisonCampaigns}
      />
    </div>
  );
}
