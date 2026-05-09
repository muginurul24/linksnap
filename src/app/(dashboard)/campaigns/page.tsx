import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Link2,
  Megaphone,
  Plus,
  Search,
  TrendingUp,
} from "lucide-react";
import { CampaignPerformanceSummary } from "@/components/campaigns/campaign-performance-summary";
import { CampaignSparkline } from "@/components/campaigns/campaign-sparkline";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  listCampaignCardsByUserId,
  type CampaignCardMetrics,
  type CampaignCardSort,
} from "@/lib/db/queries/campaigns";
import { findBillingUserById } from "@/lib/db/queries/payments";
import type { UserPlan } from "@/lib/links/limits";
import { CampaignActions } from "@/app/(dashboard)/campaigns/campaign-actions";
import { getCampaignCreateQuotaState } from "@/app/(dashboard)/campaigns/campaign-plan-gates";

const PAGE_LIMIT = 50;
const SORT_OPTIONS: Array<{ label: string; value: CampaignCardSort }> = [
  { label: "Newest", value: "newest" },
  { label: "Most Clicks", value: "most-clicks" },
  { label: "Most Links", value: "most-links" },
];

type CampaignsPageProps = {
  searchParams?: Promise<{
    q?: string;
    search?: string;
    sort?: string;
  }>;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

function getPrimaryUtm(campaign: CampaignCardMetrics): string {
  if (campaign.utmSource) return `source=${campaign.utmSource}`;
  if (campaign.utmCampaign) return `campaign=${campaign.utmCampaign}`;

  return "UTM not set";
}

function getSearchValue(params: Awaited<NonNullable<CampaignsPageProps["searchParams"]>>): string {
  const raw = params.q ?? params.search ?? "";
  return raw.trim().slice(0, 100);
}

function getSortValue(value: string | undefined): CampaignCardSort {
  return SORT_OPTIONS.some((option) => option.value === value)
    ? (value as CampaignCardSort)
    : "newest";
}

function getCampaignsHref({
  search,
  sort,
}: {
  search: string;
  sort: CampaignCardSort;
}): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (sort !== "newest") params.set("sort", sort);

  const query = params.toString();
  return query ? `/campaigns?${query}` : "/campaigns";
}

function CampaignControls({
  search,
  sort,
}: {
  search: string;
  sort: CampaignCardSort;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <form action="/campaigns" className="flex flex-col gap-2 sm:flex-row">
        <input name="sort" type="hidden" value={sort} />
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            defaultValue={search}
            name="q"
            placeholder="Search campaigns by name or slug"
          />
        </div>
        <Button className="sm:w-auto" type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div
        aria-label="Sort campaigns"
        className="grid grid-cols-3 rounded-lg border bg-background p-1"
        role="group"
      >
        {SORT_OPTIONS.map((option) => (
          <ButtonLink
            className="h-7 justify-center rounded-md px-2 text-xs"
            href={getCampaignsHref({ search, sort: option.value })}
            key={option.value}
            size="sm"
            variant={sort === option.value ? "secondary" : "ghost"}
          >
            {option.label}
          </ButtonLink>
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: CampaignCardMetrics }) {
  const hasLinks = campaign.linkCount > 0;
  const primaryUtm = getPrimaryUtm(campaign);
  const detailHref = `/campaigns/${campaign.id}`;

  return (
    <Card className="group relative overflow-hidden transition-colors hover:border-primary/40 hover:bg-muted/20">
      <Link
        aria-label={`View analytics for ${campaign.name}`}
        className="absolute inset-0 z-10"
        href={detailHref}
      />
      <CardHeader className="relative pb-3">
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
          <div className="relative z-20">
            <CampaignActions id={campaign.id} name={campaign.name} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <CampaignPerformanceSummary
          clicksLast7Days={campaign.clicksLast7Days}
          linkCount={campaign.linkCount}
          totalClicks={campaign.totalClicks}
        />
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">7-day trend</span>
            <span className="font-medium tabular-nums">
              {campaign.clicksLast7Days.toLocaleString()} clicks
            </span>
          </div>
          <CampaignSparkline data={campaign.clickTrend} />
        </div>
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1">
            <Calendar className="size-3" />
            Updated {formatDate(campaign.updatedAt)}
          </p>
          <p className="flex items-center gap-1">
            <TrendingUp className="size-3" />
            {primaryUtm}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Badge variant={hasLinks ? "default" : "secondary"}>
            {hasLinks ? "Live" : "Setup"}
          </Badge>
          <ButtonLink
            className="relative z-20"
            href={detailHref}
            size="sm"
            variant="outline"
          >
            <BarChart3 className="size-4" />
            View Analytics
          </ButtonLink>
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

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/campaigns");

  const params = (await searchParams) ?? {};
  const search = getSearchValue(params);
  const sort = getSortValue(params.sort);
  const [campaignResult, billingUser] = await Promise.all([
    listCampaignCardsByUserId({
      limit: PAGE_LIMIT,
      page: 1,
      search,
      sort,
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

      <CampaignControls search={search} sort={sort} />

      {campaigns.length === 0 ? (
        <EmptyState
          actionHref="/campaigns/new"
          actionLabel="New Campaign"
          description={
            search
              ? "No campaigns match your search. Clear the filter or create a new campaign."
              : "Create a campaign to group links and track performance together."
          }
          icon={<Link2 className="size-5" />}
          title={search ? "No matching campaigns." : "No campaigns yet."}
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
