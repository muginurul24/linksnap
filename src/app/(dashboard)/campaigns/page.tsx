import { redirect } from "next/navigation";
import {
  Calendar,
  Link2,
  Megaphone,
  Plus,
  TrendingUp,
} from "lucide-react";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import {
  listCampaignsByUserId,
  type CampaignWithLinkCount,
} from "@/lib/db/queries/campaigns";
import { findBillingUserById } from "@/lib/db/queries/payments";
import type { UserPlan } from "@/lib/links/limits";
import { CampaignActions } from "./campaign-actions";
import { getCampaignCreateQuotaState } from "./campaign-plan-gates";

const PAGE_LIMIT = 50;

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getPrimaryUtm(campaign: CampaignWithLinkCount): string {
  if (campaign.utmSource) return `source=${campaign.utmSource}`;
  if (campaign.utmCampaign) return `campaign=${campaign.utmCampaign}`;

  return "UTM not set";
}

function CampaignCard({ campaign }: { campaign: CampaignWithLinkCount }) {
  const hasLinks = campaign.linkCount > 0;
  const primaryUtm = getPrimaryUtm(campaign);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg bg-chart-2/10">
              <Megaphone className="size-5 text-chart-2" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{campaign.name}</CardTitle>
              <CardDescription className="truncate font-mono text-xs">
                /{campaign.slug}
              </CardDescription>
            </div>
          </div>
          <CampaignActions id={campaign.id} name={campaign.name} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Links</p>
            <p className="text-lg font-bold tabular-nums">
              {campaign.linkCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-bold">{hasLinks ? "Live" : "Setup"}</p>
          </div>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Calendar className="size-3" />
            Updated {formatDate(campaign.updatedAt)}
          </p>
          <p className="flex items-center gap-1">
            <TrendingUp className="size-3" />
            {primaryUtm}
          </p>
        </div>
        <div className="mt-3">
          <Badge variant={hasLinks ? "default" : "secondary"}>
            {hasLinks ? "Live" : "Setup"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

function NewCampaignButton({
  campaignCount,
  userPlan,
}: {
  campaignCount: number;
  userPlan: UserPlan;
}) {
  const quota = getCampaignCreateQuotaState({ campaignCount, userPlan });

  return (
    <PlanGate.Quota
      limit={quota.limit}
      used={quota.used}
      upgradeMessage="Campaign quota reached. Upgrade for more campaigns."
      upgradeUrl="/settings/billing?upgrade=campaigns"
    >
      <ButtonLink href="/campaigns/new" size="sm" className="mt-2 sm:mt-0">
        <Plus className="size-4" />
        New Campaign
      </ButtonLink>
    </PlanGate.Quota>
  );
}

export default async function CampaignsPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/campaigns");

  const [campaignResult, billingUser] = await Promise.all([
    listCampaignsByUserId({
      limit: PAGE_LIMIT,
      page: 1,
      userId,
    }),
    findBillingUserById(userId),
  ]);
  const { items: campaigns, total: campaignCount } = campaignResult;
  const userPlan = billingUser?.plan ?? "FREE";

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Group links into campaigns with auto UTM and unified analytics.
          </p>
        </div>
        <NewCampaignButton campaignCount={campaignCount} userPlan={userPlan} />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          actionHref="/campaigns/new"
          actionLabel="New Campaign"
          description="Create a campaign to group links and keep UTM defaults consistent."
          icon={<Link2 className="size-5" />}
          title="No campaigns yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard campaign={campaign} key={campaign.id} />
          ))}
        </div>
      )}
    </>
  );
}
