"use client";

import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const deleteConfirmationDescription = "This action cannot be undone.";

export function getDeleteConfirmationTitle(name: string): string {
  return `Are you sure you want to delete ${name}?`;
}

export function DeleteConfirmationDialogContent({
  isDeleting,
  name,
  onConfirm,
}: {
  isDeleting: boolean;
  name: string;
  onConfirm: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{getDeleteConfirmationTitle(name)}</DialogTitle>
        <DialogDescription>{deleteConfirmationDescription}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          disabled={isDeleting}
          onClick={onConfirm}
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
      </DialogFooter>
    </>
  );
}

export function DeleteConfirmationDialog({
  isDeleting,
  name,
  onConfirm,
  onOpenChange,
  open,
}: {
  isDeleting: boolean;
  name: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DeleteConfirmationDialogContent
          isDeleting={isDeleting}
          name={name}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
