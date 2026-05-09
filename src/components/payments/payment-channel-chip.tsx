"use client";

import { Building2, Check, QrCode, Smartphone, Store } from "lucide-react";
import type { PaymentChannel } from "@/lib/payments/payment-channels";
import { getChannelCategoryColors } from "@/lib/payments/payment-channels";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS = {
  "building-2": Building2,
  "qr-code": QrCode,
  smartphone: Smartphone,
  store: Store,
} as const;

type PaymentChannelChipProps = {
  channel: PaymentChannel;
  disabled?: boolean;
  onSelect: (channel: PaymentChannel) => void;
  selected: boolean;
};

export function PaymentChannelChip({
  channel,
  disabled = false,
  onSelect,
  selected,
}: PaymentChannelChipProps) {
  const Icon = CHANNEL_ICONS[channel.icon];
  const colors = getChannelCategoryColors(channel.category);

  return (
    <button
      type="button"
      aria-label={`Select ${channel.name}`}
      aria-pressed={selected}
      className={cn(
        "flex min-h-16 w-full items-center gap-2 rounded-lg border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        selected
          ? colors.selectedClassName
          : "border-border hover:border-foreground/20 hover:bg-muted/60",
      )}
      disabled={disabled}
      onClick={() => onSelect(channel)}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border",
          selected ? colors.borderClassName : "border-border bg-muted/40",
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {channel.shortName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {channel.estimatedProcessingTime}
        </span>
      </span>
      <Check
        className={cn(
          "size-4 shrink-0 transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
