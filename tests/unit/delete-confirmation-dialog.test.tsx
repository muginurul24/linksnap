import { isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DeleteConfirmationDialogContent,
  deleteConfirmationDescription,
  getDeleteConfirmationTitle,
} from "../../src/components/dashboard/delete-confirmation-dialog";

function findFirstOnClick(node: ReactNode): (() => void) | null {
  if (!isValidElement(node)) return null;

  const element = node as ReactElement<{
    children?: ReactNode;
    onClick?: () => void;
  }>;

  if (element.props.onClick) return element.props.onClick;

  const children = element.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = findFirstOnClick(child);
      if (match) return match;
    }
    return null;
  }

  return findFirstOnClick(children);
}

function collectText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => collectText(child)).join("");
  if (!isValidElement(node)) return "";

  const element = node as ReactElement<{ children?: ReactNode }>;
  return collectText(element.props.children);
}

describe("DeleteConfirmationDialog", () => {
  it("should render required destructive confirmation copy", () => {
    const text = collectText(
      DeleteConfirmationDialogContent({
        isDeleting: false,
        name: "Campaign E2E",
        onConfirm: () => undefined,
      }),
    );

    expect(text).toContain(getDeleteConfirmationTitle("Campaign E2E"));
    expect(text).toContain(deleteConfirmationDescription);
    expect(text).toContain("Cancel");
    expect(text).toContain("Delete");
  });

  it("should expose the confirm callback on the destructive action", () => {
    const onConfirm = vi.fn();
    const element = DeleteConfirmationDialogContent({
      isDeleting: false,
      name: "API key",
      onConfirm,
    });
    const onClick = findFirstOnClick(element);

    expect(onClick).toBeTypeOf("function");
    onClick?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
