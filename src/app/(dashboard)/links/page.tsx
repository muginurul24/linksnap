import { redirect } from "next/navigation";
import {
  BarChart3,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Filter,
  Globe,
  Link2,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { listLinksByUserId, type ListedLink } from "@/lib/db/queries/links";
import {
  getQrDownloadFilename,
  getQrDownloadHref,
} from "@/lib/qr/downloads";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { LinkPagePreviewDialog } from "@/app/(dashboard)/links/link-page-preview-dialog";
import {
  getLinksSearchQuery,
  LINKS_SEARCH_MAX_LENGTH,
} from "@/lib/links/search";

const PAGE_LIMIT = 20;

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

type LinksPageProps = {
  searchParams: Promise<{
    search?: string | string[];
  }>;
};

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getShortUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  return `${baseUrl || "https://www.justqiu.cloud"}/${slug}`;
}

function LinksEmptyState({ search }: { search?: string }) {
  return (
    <EmptyState
      actionHref="/links/new"
      actionLabel="Create link"
      icon={<Link2 className="size-5" />}
      title={
        search
          ? "No links match your search."
          : "No links yet. Create your first short link!"
      }
    />
  );
}

function LinkRows({ links }: { links: ListedLink[] }) {
  return (
    <TableBody>
      {links.map((link) => (
        <TableRow key={link.id} className={!link.isActive ? "opacity-50" : ""}>
          <TableCell>
            <div className="flex items-center gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <QrCode className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">/{link.slug}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {getShortUrl(link.slug)}
                </p>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <p className="max-w-[250px] truncate text-sm text-muted-foreground">
              {link.destinationUrl}
            </p>
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            {link.hasLinkPage ? (
              <Badge variant="secondary" className="text-xs">
                <Globe className="mr-1 size-3" />
                Page
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground">None</span>
            )}
          </TableCell>
          <TableCell className="text-right font-mono font-medium tabular-nums">
            {link.clickCount.toLocaleString()}
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Badge variant={link.isActive ? "default" : "secondary"}>
              {link.isActive ? "Active" : "Paused"}
            </Badge>
          </TableCell>
          <TableCell className="w-10">
            <LinkPagePreviewDialog
              link={{
                clickCount: link.clickCount,
                destinationUrl: link.destinationUrl,
                hasLinkPage: link.hasLinkPage,
                id: link.id,
                shortUrl: getShortUrl(link.slug),
                slug: link.slug,
              }}
            />
          </TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <Edit className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ExternalLink className="mr-2 size-4" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Copy className="mr-2 size-4" />
                  Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    aria-label={`Download PNG QR for ${link.slug}`}
                    className="flex w-full items-center gap-1.5"
                    download={getQrDownloadFilename(link.slug, "png")}
                    href={getQrDownloadHref(link.slug, "png")}
                  >
                    <Download className="mr-2 size-4" />
                    Download QR PNG
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    aria-label={`Download SVG QR for ${link.slug}`}
                    className="flex w-full items-center gap-1.5"
                    download={getQrDownloadFilename(link.slug, "svg")}
                    href={getQrDownloadHref(link.slug, "svg")}
                  >
                    <Download className="mr-2 size-4" />
                    Download QR SVG
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="mr-2 size-4" />
                  Analytics
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const session = await auth();
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login?callbackUrl=/links");

  const params = await searchParams;
  const search = getLinksSearchQuery(params.search);
  const { items: links } = await listLinksByUserId({
    limit: PAGE_LIMIT,
    page: 1,
    search,
    userId,
  });

  return (
    <>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Links</h1>
          <p className="text-sm text-muted-foreground">
            Manage your short links, smart rules, and link pages.
          </p>
        </div>
        <ButtonLink href="/links/new" size="sm" className="mt-2 sm:mt-0">
          <Plus className="size-4" />
          Create Link
        </ButtonLink>
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
        <LinksEmptyState search={search} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead className="hidden md:table-cell">Destination</TableHead>
                  <TableHead className="hidden sm:table-cell">Features</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Preview</span>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <LinkRows links={links} />
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
