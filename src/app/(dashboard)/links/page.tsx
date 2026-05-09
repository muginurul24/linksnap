import { redirect } from "next/navigation";
import {
  Filter,
  Link2,
  Plus,
  Search,
} from "lucide-react";
import { PlanGate } from "@/components/plan-gate";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  countLinksByUserId,
  listLinksWithTrendsByUserId,
  type ListedLinkWithTrend,
} from "@/lib/db/queries/links";
import { listCampaignsByUserId } from "@/lib/db/queries/campaigns";
import { findBillingUserById } from "@/lib/db/queries/payments";
import { hydrateRedirectClickCounts } from "@/lib/links/click-count-cache";
import type { UserPlan } from "@/lib/links/limits";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  LinksTableClient,
  type LinkTableItem,
} from "@/app/(dashboard)/links/links-table-client";
import {
  getLinksSearchQuery,
  LINKS_SEARCH_MAX_LENGTH,
} from "@/lib/links/search";
import { getLinkCreateQuotaState } from "@/app/(dashboard)/links/link-plan-gates";

const PAGE_LIMIT = 20;

type LinksPageProps = {
  searchParams: Promise<{
    search?: string | string[];
  }>;
};

function getShortUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl || "https://www.justqiu.cloud"}/${slug}`;
}

function toLinkTableItem(link: ListedLinkWithTrend): LinkTableItem {
  return {
    campaignId: link.campaignId,
    clickCount: link.clickCount,
    clickTrend: link.clickTrend,
    clicksLast7Days: link.clicksLast7Days,
    createdAt: link.createdAt.toISOString(),
    destinationUrl: link.destinationUrl,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    isActive: link.isActive,
    shortUrl: getShortUrl(link.slug),
    slug: link.slug,
    title: link.title,
  };
}

function LinksEmptyState({
  canCreateLink,
  search,
}: {
  canCreateLink: boolean;
  search?: string;
}) {
  return (
    <EmptyState
      actionHref={canCreateLink ? "/links/new" : undefined}
      actionLabel={canCreateLink ? "Create link" : undefined}
      icon={<Link2 className="size-5" />}
      title={
        search
          ? "No links match your search."
          : "No links yet. Create your first short link!"
      }
    />
  );
}

function CreateLinkButton({
  linkCount,
  userPlan,
}: {
  linkCount: number;
  userPlan: UserPlan;
}) {
  const quota = getLinkCreateQuotaState({ linkCount, userPlan });

  return (
    <PlanGate.Quota
      limit={quota.limit}
      used={quota.used}
      upgradeMessage="Link quota reached. Upgrade for more short links."
      upgradeUrl="/settings/billing?upgrade=links"
    >
      <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0">
        <Plus className="size-4" />
        Create Link
      </ButtonLink>
    </PlanGate.Quota>
  );
}

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/links");

  const params = await searchParams;
  const search = getLinksSearchQuery(params.search);
  const [linkResult, linkCount, billingUser, campaignResult] = await Promise.all([
    listLinksWithTrendsByUserId({
      limit: PAGE_LIMIT,
      page: 1,
      search,
      userId,
    }),
    countLinksByUserId(userId),
    findBillingUserById(userId),
    listCampaignsByUserId({
      limit: 100,
      page: 1,
      userId,
    }),
  ]);
  const links = await hydrateRedirectClickCounts(linkResult.items);
  const userPlan = billingUser?.plan ?? "FREE";
  const createLinkQuota = getLinkCreateQuotaState({ linkCount, userPlan });
  const canCreateLink = createLinkQuota.used < createLinkQuota.limit;

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links, smart rules, and link pages.
          </p>
        </div>
        <CreateLinkButton linkCount={linkCount} userPlan={userPlan} />
      </div>

      <form action="/links" className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            defaultValue={search ?? ""}
            maxLength={LINKS_SEARCH_MAX_LENGTH}
            name="search"
            placeholder="Search by slug or destination..."
            type="search"
          />
        </div>
        <Button aria-label="Search links" variant="outline" size="icon" type="submit">
          <Filter className="size-4" />
        </Button>
      </form>

      {links.length === 0 ? (
        <LinksEmptyState canCreateLink={canCreateLink} search={search} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <LinksTableClient
              campaigns={campaignResult.items.map((campaign) => ({
                id: campaign.id,
                name: campaign.name,
              }))}
              links={links.map(toLinkTableItem)}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
