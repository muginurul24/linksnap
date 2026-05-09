import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  formatCtr,
  LinkPagePerformanceSummary,
} from "@/components/link-pages/link-page-performance-summary";
import { LinkPageSparkline } from "@/components/link-pages/link-page-sparkline";
import { auth } from "@/lib/auth";
import { getSessionUserId } from "@/lib/auth/session-helpers";
import {
  listLinkPagesByUserId,
  type ListedLinkPage,
} from "@/lib/db/queries/links";
import {
  Plus,
  Globe,
  ExternalLink,
  Timer,
  Eye,
  QrCode,
  Edit,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function LinkPageCard({ page }: { page: ListedLinkPage }) {
  const editHref = `/links/${page.slug}/edit`;
  const analyticsHref = `/analytics?range=30&linkId=${encodeURIComponent(page.linkId)}`;
  const previewHref = `/${page.slug}`;

  return (
    <Card
      className={`group relative overflow-hidden transition-colors hover:border-primary/40 hover:bg-muted/20 ${
        !page.isActive ? "opacity-60" : ""
      }`}
    >
      <Link
        aria-label={`View analytics for ${page.brandName}`}
        className="absolute inset-0 z-10"
        href={analyticsHref}
      />
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{page.brandName}</CardTitle>
              <CardDescription className="truncate font-mono text-xs">
                /{page.slug}
              </CardDescription>
            </div>
          </div>
          <div className="relative z-20 flex items-center gap-1">
            <Switch
              aria-label={`Link Page status for ${page.slug}`}
              checked={page.isActive}
              disabled
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon" className="size-8" />}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem render={<Link href={editHref} />}>
                  <Edit className="mr-2 size-4" />
                  Edit Page
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link href={previewHref} rel="noreferrer" target="_blank" />
                  }
                >
                  <ExternalLink className="mr-2 size-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href={analyticsHref} />}>
                  <Eye className="mr-2 size-4" />
                  View Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="mb-4 line-clamp-2 min-h-10 text-sm">{page.title}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ExternalLink className="size-3" />
            {page.ctaText}
          </span>
          {page.hasCountdown && (
            <span className="flex items-center gap-1">
              <Timer className="size-3" />
              Countdown
            </span>
          )}
          {page.showQrCode && (
            <span className="flex items-center gap-1">
              <QrCode className="size-3" />
              QR
            </span>
          )}
        </div>
        <div className="mt-4">
          <LinkPagePerformanceSummary
            ctaClicks={page.ctaClicks}
            pageViews={page.pageViews}
            pageViewsLast7Days={page.pageViewsLast7Days}
          />
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">7-day page views</span>
            <span className="font-medium tabular-nums">
              {page.pageViewsLast7Days.toLocaleString()} views
            </span>
          </div>
          <LinkPageSparkline data={page.clickTrend} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline">CTR {formatCtr(page.ctaClickThroughRate)}</Badge>
            <Badge variant={page.isActive ? "default" : "secondary"}>
              {page.isActive ? "Active" : "Paused"}
            </Badge>
          </div>
          <ButtonLink
            className="relative z-20"
            href={analyticsHref}
            size="sm"
            variant="outline"
          >
            <Eye className="size-4" />
            View Analytics
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function LinkPagesPage() {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/pages");

  const linkPages = await listLinkPagesByUserId(userId);

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Link Pages</h1>
          <p className="text-sm text-muted-foreground">
            Micro landing pages that turn every link into a conversion engine.
          </p>
        </div>
        <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0">
          <Plus className="size-4" />
          Create Link Page
        </ButtonLink>
      </div>

      {linkPages.length === 0 ? (
        <EmptyState
          actionHref="/links/new"
          actionLabel="Create Link Page"
          description="Create a short link and enable its Link Page section."
          icon={<Globe className="size-5" />}
          title="No Link Pages yet."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {linkPages.map((page) => (
            <LinkPageCard key={page.id} page={page} />
          ))}
        </div>
      )}
    </>
  );
}
