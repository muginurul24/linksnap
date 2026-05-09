"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  BarChart3,
  Copy,
  Download,
  Edit,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "@/components/dashboard/delete-confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getQrDownloadFilename,
  getQrDownloadHref,
} from "@/lib/qr/downloads";
import { finishSingleFlight, tryStartSingleFlight } from "@/lib/actions/single-flight";

type LinkActionsProps = {
  id: string;
  shortUrl: string;
  slug: string;
};

type ApiEnvelope<T> =
  | { data: T; success: true }
  | {
      error: {
        code: string;
        details?: unknown;
        message?: string;
      };
      success: false;
    };

function getRetryAfter(details: unknown): number | null {
  if (typeof details !== "object" || details === null) return null;

  const retryAfter = (details as Record<string, unknown>).retryAfter;
  return typeof retryAfter === "number" && Number.isFinite(retryAfter)
    ? Math.ceil(retryAfter)
    : null;
}

function apiErrorMessage(
  code: string,
  fallback?: string,
  details?: unknown,
): string {
  const retryAfter = getRetryAfter(details);
  if (code === "RATE_LIMITED" && retryAfter !== null) {
    return `Too many requests. Try again in ${retryAfter} seconds.`;
  }

  const messages: Record<string, string> = {
    FORBIDDEN: "You do not have access to this link.",
    LINK_NOT_FOUND: "Link not found.",
    RATE_LIMITED: "Too many requests. Try again later.",
  };

  return messages[code] ?? fallback ?? "Unable to delete link.";
}

async function copyToClipboard(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
  toast.success("Copied.");
}

export function LinkActions({ id, shortUrl, slug }: LinkActionsProps) {
  const router = useRouter();
  const deleteGuard = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!tryStartSingleFlight(deleteGuard)) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/links/${id}`, {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
        method: "DELETE",
      });
      const body = (await response.json()) as ApiEnvelope<{
        deleted: boolean;
        id: string;
      }>;

      if (!body.success) {
        toast.error(
          apiErrorMessage(body.error.code, body.error.message, body.error.details),
        );
        return;
      }

      toast.success("Link deleted.", { description: `/${slug}` });
      setIsDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Unable to reach the link service.");
    } finally {
      finishSingleFlight(deleteGuard);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Open actions for /${slug}`}
              className="size-8"
              size="icon"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem render={<Link href={`/links/${slug}/edit`} />}>
            <Edit className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<a href={shortUrl} rel="noreferrer" target="_blank" />}
          >
            <ExternalLink className="mr-2 size-4" />
            Open
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyToClipboard(shortUrl)}>
            <Copy className="mr-2 size-4" />
            Copy URL
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                aria-label={`Download PNG QR for ${slug}`}
                download={getQrDownloadFilename(slug, "png")}
                href={getQrDownloadHref(slug, "png")}
              />
            }
          >
            <Download className="mr-2 size-4" />
            Download QR PNG
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                aria-label={`Download SVG QR for ${slug}`}
                download={getQrDownloadFilename(slug, "svg")}
                href={getQrDownloadHref(slug, "svg")}
              />
            }
          >
            <Download className="mr-2 size-4" />
            Download QR SVG
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/analytics" />}>
            <BarChart3 className="mr-2 size-4" />
            Analytics
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmationDialog
        isDeleting={isDeleting}
        name={`/${slug}`}
        onConfirm={() => void handleDelete()}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </>
  );
}
