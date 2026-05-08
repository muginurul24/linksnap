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
  const previewHref = `/${page.slug}`;

  return (
    <Card className={!page.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
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
          <div className="flex items-center gap-1">
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
                <DropdownMenuItem render={<Link href="/analytics" />}>
                  <Eye className="mr-2 size-4" />
                  View Analytics
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border bg-muted/50 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Page Views</p>
            <p className="text-lg font-bold tabular-nums">
              {page.pageViews.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CTA Clicks</p>
            <p className="text-lg font-bold tabular-nums">
              {page.ctaClicks.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-1">
          <Badge variant={page.isActive ? "default" : "secondary"}>
            {page.isActive ? "Active" : "Paused"}
          </Badge>
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
          description="Create a short link and enable its Link Page section to publish your first branded page."
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
