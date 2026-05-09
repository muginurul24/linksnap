"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownAZ,
  ArrowDownUp,
  ArrowUpAZ,
  Download,
  Globe,
  LineChart,
  Loader2,
  Megaphone,
  QrCode,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/dashboard/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkActions } from "@/app/(dashboard)/links/link-actions";
import { LinkPagePreviewDialog } from "@/app/(dashboard)/links/link-page-preview-dialog";

export type LinkTableCampaign = {
  id: string;
  name: string;
};

export type LinkTableTrendPoint = {
  date: string;
  totalClicks: number;
};

export type LinkTableItem = {
  campaignId: string | null;
  clickCount: number;
  clickTrend: LinkTableTrendPoint[];
  clicksLast7Days: number;
  createdAt: string;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  shortUrl: string;
  slug: string;
  title: string | null;
};

type LinkSortKey = "clicks" | "created" | "destination" | "slug" | "status";
type SortDirection = "asc" | "desc";

type LinkSortState = {
  direction: SortDirection;
  key: LinkSortKey;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        details?: unknown;
        message?: string;
        requestId?: string;
      };
      success: false;
    };

const DEFAULT_SORT: LinkSortState = { direction: "desc", key: "created" };

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, "en", { numeric: true, sensitivity: "base" });
}

function compareLinkValues(a: LinkTableItem, b: LinkTableItem, key: LinkSortKey) {
  if (key === "slug") return compareText(a.slug, b.slug);
  if (key === "destination") return compareText(a.destinationUrl, b.destinationUrl);
  if (key === "clicks") return a.clickCount - b.clickCount;
  if (key === "created") {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
  if (a.isActive === b.isActive) return compareText(a.slug, b.slug);

  return Number(a.isActive) - Number(b.isActive);
}

export function sortLinksForTable(
  items: LinkTableItem[],
  sort: LinkSortState = DEFAULT_SORT,
): LinkTableItem[] {
  const direction = sort.direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const primary = compareLinkValues(a, b, sort.key) * direction;
    if (primary !== 0) return primary;

    return (
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
      compareText(a.id, b.id)
    );
  });
}

function apiErrorMessage(body: ApiEnvelope<unknown>, fallback: string): string {
  if (body.success) return fallback;

  const messages: Record<string, string> = {
    AUTHENTICATION_REQUIRED: "Your session expired. Sign in again and retry.",
    CAMPAIGN_NOT_FOUND: "Campaign not found.",
    FORBIDDEN: "You do not have access to one of the selected links.",
    LINK_NOT_FOUND: "One or more selected links were not found.",
    RATE_LIMITED: "Too many requests. Try again shortly.",
    VALIDATION_ERROR: "Review the selected links and try again.",
  };

  return messages[body.error.code] ?? body.error.message ?? fallback;
}

async function readApiEnvelope<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.success) {
    throw new Error(apiErrorMessage(body as ApiEnvelope<unknown>, fallback));
  }

  return body.data;
}

function escapeCsv(value: string | number | null): string {
  const text = value === null ? "" : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function buildLinksCsv(links: LinkTableItem[]): string {
  const headers = [
    "Slug",
    "Short URL",
    "Destination URL",
    "Status",
    "Total Clicks",
    "Last 7 Days",
    "Created At",
    "Campaign ID",
  ];
  const rows = links.map((link) => [
    `/${link.slug}`,
    link.shortUrl,
    link.destinationUrl,
    link.isActive ? "Active" : "Paused",
    link.clickCount,
    link.clicksLast7Days,
    link.createdAt,
    link.campaignId,
  ]);

  return [headers, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\n");
}

function DownloadTrend({ link }: { link: LinkTableItem }) {
  const max = Math.max(1, ...link.clickTrend.map((point) => point.totalClicks));

  return (
    <div className="mt-1 flex items-end justify-end gap-0.5" aria-label={`${link.clicksLast7Days} clicks in the last 7 days`}>
      {link.clickTrend.map((point) => (
        <span
          className="block w-1 rounded-full bg-primary/60"
          key={point.date}
          style={{ height: `${Math.max(3, (point.totalClicks / max) * 16)}px` }}
          title={`${point.date}: ${point.totalClicks}`}
        />
      ))}
    </div>
  );
}

function SortHeader({
  children,
  className,
  onSort,
  sort,
  sortKey,
}: {
  children: React.ReactNode;
  className?: string;
  onSort: (key: LinkSortKey) => void;
  sort: LinkSortState;
  sortKey: LinkSortKey;
}) {
  const isActive = sort.key === sortKey;
  const Icon = !isActive
    ? ArrowDownUp
    : sort.direction === "asc"
      ? ArrowUpAZ
      : ArrowDownAZ;

  return (
    <TableHead className={className}>
      <Button
        className="h-7 px-1 text-xs font-medium"
        onClick={() => onSort(sortKey)}
        size="sm"
        type="button"
        variant="ghost"
      >
        {children}
        <Icon className="size-3.5" />
      </Button>
    </TableHead>
  );
}

function SelectionCheckbox({
  checked,
  indeterminate,
  label,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <label className="flex items-center justify-center">
      <span className="sr-only">{label}</span>
      <input
        checked={checked}
        className="size-4 rounded border-input accent-primary"
        onChange={(event) => onChange(event.target.checked)}
        ref={ref}
        type="checkbox"
      />
    </label>
  );
}

export function LinksTableClient({
  campaigns,
  links,
}: {
  campaigns: LinkTableCampaign[];
  links: LinkTableItem[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState<string | undefined>(
    campaigns[0]?.id,
  );
  const [sort, setSort] = useState<LinkSortState>(DEFAULT_SORT);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const sortedLinks = useMemo(() => sortLinksForTable(links, sort), [links, sort]);
  const selectedLinks = useMemo(() => {
    const selected = new Set(selectedIds);

    return links.filter((link) => selected.has(link.id));
  }, [links, selectedIds]);
  const selectedCount = selectedIds.length;
  const visibleIds = sortedLinks.map((link) => link.id);
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const isSomeVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;

  const toggleSort = (key: LinkSortKey) => {
    setSort((current) => ({
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
      key,
    }));
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const currentSet = new Set(current);

      if (checked) {
        for (const id of visibleIds) currentSet.add(id);
      } else {
        for (const id of visibleIds) currentSet.delete(id);
      }

      return [...currentSet];
    });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, id])] : current.filter((item) => item !== id),
    );
  };

  const assignSelectedToCampaign = async () => {
    if (!campaignId || selectedIds.length === 0 || isAssigning) return;

    setIsAssigning(true);

    try {
      await readApiEnvelope(
        await fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/links`, {
          body: JSON.stringify({ linkIds: selectedIds }),
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          method: "POST",
        }),
        "Unable to add selected links to campaign.",
      );

      toast.success("Selected links added to campaign.", {
        description: `${selectedIds.length} link${selectedIds.length === 1 ? "" : "s"} updated.`,
      });
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to add selected links to campaign.",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const deleteSelectedLinks = async () => {
    if (selectedIds.length === 0 || isDeleting) return;

    setIsDeleting(true);

    try {
      for (const id of selectedIds) {
        await readApiEnvelope(
          await fetch(`/api/v1/links/${encodeURIComponent(id)}`, {
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
            method: "DELETE",
          }),
          "Unable to delete one of the selected links.",
        );
      }

      toast.success("Selected links deleted.", {
        description: `${selectedIds.length} link${selectedIds.length === 1 ? "" : "s"} paused.`,
      });
      setIsDeleteOpen(false);
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete selected links.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const exportSelectedCsv = () => {
    if (selectedLinks.length === 0) return;

    const blob = new Blob([buildLinksCsv(selectedLinks)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `linksnap-links-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <SelectionCheckbox
            checked={isAllVisibleSelected}
            indeterminate={isSomeVisibleSelected}
            label="Select all visible links"
            onChange={toggleAllVisible}
          />
          <span className="font-medium">
            {selectedCount > 0
              ? `${selectedCount} selected`
              : `${links.length} visible link${links.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {campaigns.length > 0 ? (
            <Select
              value={campaignId}
              onValueChange={(value) => setCampaignId(value ?? undefined)}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent align="end">
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button nativeButton={false} render={<Link href="/campaigns/new" />} size="sm" variant="outline">
              <Megaphone className="size-4" />
              Create Campaign
            </Button>
          )}
          <Button
            disabled={selectedCount === 0 || !campaignId || isAssigning}
            onClick={() => void assignSelectedToCampaign()}
            size="sm"
            type="button"
            variant="outline"
          >
            {isAssigning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Megaphone className="size-4" />
            )}
            Add to Campaign
          </Button>
          <Button
            disabled={selectedCount === 0}
            onClick={exportSelectedCsv}
            size="sm"
            type="button"
            variant="outline"
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Button
            disabled={selectedCount === 0 || isDeleting}
            onClick={() => setIsDeleteOpen(true)}
            size="sm"
            type="button"
            variant="destructive"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">Select</span>
              </TableHead>
              <SortHeader onSort={toggleSort} sort={sort} sortKey="slug">
                Link
              </SortHeader>
              <SortHeader
                className="hidden md:table-cell"
                onSort={toggleSort}
                sort={sort}
                sortKey="destination"
              >
                Destination
              </SortHeader>
              <TableHead className="hidden sm:table-cell">Features</TableHead>
              <SortHeader
                className="hidden text-right sm:table-cell"
                onSort={toggleSort}
                sort={sort}
                sortKey="clicks"
              >
                Clicks
              </SortHeader>
              <SortHeader
                className="hidden lg:table-cell"
                onSort={toggleSort}
                sort={sort}
                sortKey="status"
              >
                Status
              </SortHeader>
              <SortHeader
                className="hidden lg:table-cell"
                onSort={toggleSort}
                sort={sort}
                sortKey="created"
              >
                Created
              </SortHeader>
              <TableHead className="w-10">
                <span className="sr-only">Preview</span>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedLinks.map((link) => (
              <TableRow key={link.id} className={!link.isActive ? "opacity-50" : ""}>
                <TableCell>
                  <SelectionCheckbox
                    checked={selectedIds.includes(link.id)}
                    label={`Select /${link.slug}`}
                    onChange={(checked) => toggleSelected(link.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <QrCode className="size-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-medium">
                        /{link.slug}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {link.shortUrl}
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
                    <Badge className="text-xs" variant="secondary">
                      <Globe className="mr-1 size-3" />
                      Page
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right sm:table-cell">
                  <div className="font-mono font-medium tabular-nums">
                    {formatNumber(link.clickCount)}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                    <LineChart className="size-3" />
                    {formatNumber(link.clicksLast7Days)} 7d
                  </div>
                  <DownloadTrend link={link} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Badge variant={link.isActive ? "default" : "secondary"}>
                    {link.isActive ? "Active" : "Paused"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {formatDate(link.createdAt)}
                </TableCell>
                <TableCell className="w-10">
                  <LinkPagePreviewDialog
                    link={{
                      clickCount: link.clickCount,
                      destinationUrl: link.destinationUrl,
                      hasLinkPage: link.hasLinkPage,
                      id: link.id,
                      shortUrl: link.shortUrl,
                      slug: link.slug,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <LinkActions
                    id={link.id}
                    shortUrl={link.shortUrl}
                    slug={link.slug}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteConfirmationDialog
        isDeleting={isDeleting}
        name={`${selectedCount} selected link${selectedCount === 1 ? "" : "s"}`}
        onConfirm={() => void deleteSelectedLinks()}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </div>
  );
}
