"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BarChart3, Edit, MoreHorizontal, Trash2 } from "lucide-react";
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

type CampaignActionsProps = {
  id: string;
  name: string;
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
    CAMPAIGN_NOT_FOUND: "Campaign not found.",
    FORBIDDEN: "You do not have access to this campaign.",
    RATE_LIMITED: "Too many requests. Try again later.",
  };

  return messages[code] ?? fallback ?? "Unable to delete campaign.";
}

export function CampaignActions({ id, name }: CampaignActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/v1/campaigns/${id}`, {
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

      toast.success("Campaign deleted.", { description: name });
      setIsDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("Unable to reach the campaign service.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={`Open actions for ${name}`}
              variant="ghost"
              size="icon"
              className="size-8"
            />
          }
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/campaigns/${id}/edit`} />}>
            <Edit className="mr-2 size-4" />
            Edit
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
        name={name}
        onConfirm={() => void handleDelete()}
        onOpenChange={setIsDeleteOpen}
        open={isDeleteOpen}
      />
    </>
  );
}
