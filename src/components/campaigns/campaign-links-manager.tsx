"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/dashboard/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CampaignLinksManagerProps = {
  campaign: {
    id: string;
    name: string;
    slug: string;
  };
  onLinksChanged: () => void;
};

type CampaignLink = {
  campaignId: string | null;
  clickCount: number;
  createdAt: string;
  destinationUrl: string;
  hasLinkPage: boolean;
  id: string;
  isActive: boolean;
  shortUrl: string;
  slug: string;
  title: string | null;
  updatedAt: string;
};

type UTMPreview = {
  destinationUrl: string;
  id: string;
  previewUrl: string;
  skippedReason?: "existing_utm" | "no_utm_params";
  utmApplied: boolean;
};

type ApiEnvelope<T> =
  | { data: T; meta?: Record<string, unknown>; success: true }
  | {
      error: {
        code: string;
        message?: string;
        requestId?: string;
      };
      success: false;
    };

class ApiClientError extends Error {
  requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.requestId = requestId;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function getApiErrorMessage(body: ApiEnvelope<unknown>, fallback: string): string {
  if (body.success) return fallback;

  const messages: Record<string, string> = {
    CAMPAIGN_LINK_NOT_FOUND: "That link is no longer attached to this campaign.",
    LINK_NOT_FOUND: "One or more links were not found.",
    RATE_LIMITED: "Too many requests. Try again shortly.",
    VALIDATION_ERROR: "Check the selected links and try again.",
  };

  return messages[body.error.code] ?? body.error.message ?? fallback;
}

async function readApiEnvelope<T>(
  response: Response,
  fallback: string,
): Promise<T> {
  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !body.success) {
    throw new ApiClientError(
      getApiErrorMessage(body as ApiEnvelope<unknown>, fallback),
      body.success ? undefined : body.error.requestId,
    );
  }

  return body.data;
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-56" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-4 w-12" />
          </TableCell>
          <TableCell>
            <Skeleton className="ml-auto h-7 w-20" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function LinksErrorState({
  message,
  onRetry,
  requestId,
}: {
  message: string;
  onRetry: () => void;
  requestId?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/25 p-6 text-center">
      <AlertCircle className="size-8 text-destructive" />
      <div>
        <p className="text-sm font-medium">Campaign links could not load</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {requestId ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            Request ID: {requestId}
          </p>
        ) : null}
      </div>
      <Button onClick={onRetry} size="sm" type="button" variant="outline">
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
}

function AddLinksDialog({
  campaignId,
  onAdded,
  onOpenChange,
  open,
}: {
  campaignId: string;
  onAdded: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [availableLinks, setAvailableLinks] = useState<CampaignLink[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<UTMPreview[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [pickerReloadToken, setPickerReloadToken] = useState(0);
  const selectedKey = selectedIds.join(",");
  const selectedLinksById = useMemo(
    () => new Map(availableLinks.map((link) => [link.id, link])),
    [availableLinks],
  );

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: "20",
      page: "1",
      unassigned: "true",
    });
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/v1/links?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        readApiEnvelope<CampaignLink[]>(
          response,
          "Unable to load available links.",
        ),
      )
      .then((links) => {
        if (controller.signal.aborted) return;
        setPickerError(null);
        setAvailableLinks(links);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAvailableLinks([]);
        setPickerError(
          error instanceof Error ? error.message : "Unable to load available links.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPickerLoading(false);
      });

    return () => controller.abort();
  }, [open, pickerReloadToken, search]);

  useEffect(() => {
    if (!open || selectedIds.length === 0) return;

    const controller = new AbortController();

    fetch(`/api/v1/campaigns/${encodeURIComponent(campaignId)}/links`, {
      body: JSON.stringify({ linkIds: selectedIds, preview: true }),
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      method: "POST",
      signal: controller.signal,
    })
      .then((response) =>
        readApiEnvelope<{ links: UTMPreview[] }>(
          response,
          "Unable to preview campaign UTM changes.",
        ),
      )
      .then((data) => {
        if (controller.signal.aborted) return;
        setPreviewError(null);
        setPreviews(data.links);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPreviews([]);
        setPreviewError(
          error instanceof Error
            ? error.message
            : "Unable to preview campaign UTM changes.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPreviewLoading(false);
      });

    return () => controller.abort();
  }, [campaignId, open, selectedIds, selectedKey]);

  const closeDialog = () => {
    setSelectedIds([]);
    setSearch("");
    setPreviews([]);
    setPickerError(null);
    setPreviewError(null);
    onOpenChange(false);
  };

  const toggleSelected = (id: string, checked: boolean) => {
    const nextIds = checked
      ? [...selectedIds, id]
      : selectedIds.filter((selectedId) => selectedId !== id);

    setSelectedIds(nextIds);
    setPreviewError(null);
    if (nextIds.length === 0) {
      setPreviews([]);
      setIsPreviewLoading(false);
      return;
    }

    setIsPreviewLoading(true);
  };

  const addSelectedLinks = async () => {
    if (selectedIds.length === 0 || isAdding) return;

    setIsAdding(true);

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
        "Unable to add links to campaign.",
      );

      toast.success("Links added to campaign.");
      closeDialog();
      onAdded();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add links to campaign.",
      );
    } finally {
      setIsAdding(false);
    }
  };

  const canAdd =
    selectedIds.length > 0 &&
    !isAdding &&
    !isPreviewLoading &&
    previews.length === selectedIds.length;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setIsPickerLoading(true);
        onOpenChange(true);
        return;
      }

      closeDialog();
    }}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add links to campaign</DialogTitle>
          <DialogDescription>
            Pick uncampaigned links and review the UTM preview before attaching them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              onChange={(event) => {
                setSearch(event.target.value);
                setIsPickerLoading(true);
                setPickerReloadToken((value) => value + 1);
              }}
              placeholder="Search uncampaigned links"
              value={search}
            />
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-3 py-2 text-sm font-medium">
              Available Links
            </div>
            {pickerError ? (
              <p className="p-3 text-sm text-destructive">{pickerError}</p>
            ) : null}
            {isPickerLoading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : null}
            {!isPickerLoading && !pickerError && availableLinks.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                No uncampaigned links found.
              </p>
            ) : null}
            {!isPickerLoading && availableLinks.length > 0 ? (
              <div className="max-h-56 divide-y overflow-y-auto">
                {availableLinks.map((link) => {
                  const checked = selectedIds.includes(link.id);

                  return (
                    <label
                      className="flex cursor-pointer items-start gap-3 p-3 text-sm hover:bg-muted/40"
                      key={link.id}
                    >
                      <input
                        checked={checked}
                        className="mt-1 size-4 accent-primary"
                        disabled={isAdding}
                        onChange={(event) =>
                          toggleSelected(link.id, event.target.checked)
                        }
                        type="checkbox"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          /{link.slug}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {link.destinationUrl}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border">
            <div className="border-b px-3 py-2 text-sm font-medium">
              UTM Preview
            </div>
            {selectedIds.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                Select at least one link to preview campaign UTM changes.
              </p>
            ) : null}
            {isPreviewLoading ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Previewing UTM changes...
              </div>
            ) : null}
            {previewError ? (
              <p className="p-3 text-sm text-destructive">{previewError}</p>
            ) : null}
            {!isPreviewLoading && previews.length > 0 ? (
              <div className="divide-y">
                {previews.map((preview) => {
                  const link = selectedLinksById.get(preview.id);

                  return (
                    <div className="space-y-1 p-3 text-sm" key={preview.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-medium">
                          /{link?.slug ?? preview.id}
                        </p>
                        <Badge variant={preview.utmApplied ? "default" : "secondary"}>
                          {preview.utmApplied ? "UTM applied" : "No change"}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {preview.previewUrl}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={closeDialog} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={!canAdd} onClick={() => void addSelectedLinks()} type="button">
            {isAdding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add to Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignLinksManager({
  campaign,
  onLinksChanged,
}: CampaignLinksManagerProps) {
  const [links, setLinks] = useState<CampaignLink[]>([]);
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(
    null,
  );
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [linkToRemove, setLinkToRemove] = useState<CampaignLink | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refreshLinks = () => {
    setError(null);
    setIsLoading(true);
    setReloadToken((value) => value + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "50", page: "1" });

    fetch(
      `/api/v1/campaigns/${encodeURIComponent(campaign.id)}/links?${params.toString()}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then((response) =>
        readApiEnvelope<CampaignLink[]>(
          response,
          "Unable to load campaign links.",
        ),
      )
      .then((nextLinks) => {
        if (controller.signal.aborted) return;
        setError(null);
        setLinks(nextLinks);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setLinks([]);
        setError({
          message:
            loadError instanceof Error
              ? loadError.message
              : "Unable to load campaign links.",
          requestId:
            loadError instanceof ApiClientError ? loadError.requestId : undefined,
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [campaign.id, reloadToken]);

  const removeSelectedLink = async () => {
    if (!linkToRemove || isRemoving) return;

    setIsRemoving(true);

    try {
      await readApiEnvelope(
        await fetch(`/api/v1/campaigns/${encodeURIComponent(campaign.id)}/links`, {
          body: JSON.stringify({ linkId: linkToRemove.id }),
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          method: "DELETE",
        }),
        "Unable to remove link from campaign.",
      );

      toast.success("Link removed from campaign.", {
        description: `/${linkToRemove.slug}`,
      });
      setLinkToRemove(null);
      refreshLinks();
      onLinksChanged();
    } catch (removeError) {
      toast.error(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove link from campaign.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card data-testid="campaign-links-manager">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Campaign Links</CardTitle>
          <CardDescription>
            Manage links attached to this campaign and keep analytics connected.
          </CardDescription>
        </div>
        <Button onClick={() => {
          setIsAddOpen(true);
        }} size="sm" type="button">
          <Plus className="size-4" />
          Add Links
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <LinksErrorState
            message={error.message}
            onRetry={refreshLinks}
            requestId={error.requestId}
          />
        ) : null}

        {!error ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? <LoadingRows /> : null}
                {!isLoading && links.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-center" colSpan={5}>
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <Link2 className="size-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          No links in this campaign yet.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Add uncampaigned links to start tracking campaign
                          performance.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!isLoading
                  ? links.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate font-medium">/{link.slug}</p>
                            {link.title ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {link.title}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-muted-foreground">
                          {link.destinationUrl}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatNumber(link.clickCount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={link.isActive ? "default" : "secondary"}>
                            {link.isActive ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button
                              aria-label={`Edit ${link.slug}`}
                              nativeButton={false}
                              render={
                                <Link
                                  href={`/links/${encodeURIComponent(link.slug)}/edit`}
                                />
                              }
                              size="icon-sm"
                              variant="ghost"
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                            <Button
                              aria-label={`Remove ${link.slug} from campaign`}
                              onClick={() => setLinkToRemove(link)}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>

      <AddLinksDialog
        campaignId={campaign.id}
        onAdded={() => {
          refreshLinks();
          onLinksChanged();
        }}
        onOpenChange={setIsAddOpen}
        open={isAddOpen}
      />
      <DeleteConfirmationDialog
        isDeleting={isRemoving}
        name={linkToRemove ? `/${linkToRemove.slug} from ${campaign.name}` : "link"}
        onConfirm={() => void removeSelectedLink()}
        onOpenChange={(open) => {
          if (!open) setLinkToRemove(null);
        }}
        open={Boolean(linkToRemove)}
      />
    </Card>
  );
}
