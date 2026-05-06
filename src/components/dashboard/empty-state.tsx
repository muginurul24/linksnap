import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description?: string;
  icon: ReactNode;
  title: string;
};

export function EmptyState({
  actionHref,
  actionLabel,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
        {icon}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionHref && actionLabel ? (
        <ButtonLink className="mt-5" href={actionHref} size="sm">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}
