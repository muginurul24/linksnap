"use client";

import { useMemo, useState } from "react";
import { Building2, QrCode, Search, Smartphone, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentChannelChip } from "@/components/payments/payment-channel-chip";
import {
  ALL_PAYMENT_CHANNELS,
  CHANNELS_BY_CATEGORY,
  type PaymentChannel,
  type PaymentChannelCategory,
} from "@/lib/payments/payment-channels";
import type { PaymentChannelCode } from "@/lib/payments/paygate";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: PaymentChannelCategory[] = [
  "bank_transfer",
  "ewallet",
  "qris",
  "convenience_store",
];

const CATEGORY_ICONS = {
  bank_transfer: Building2,
  convenience_store: Store,
  ewallet: Smartphone,
  qris: QrCode,
} as const;

type PaymentMethodSelectorProps = {
  channels?: readonly PaymentChannel[];
  className?: string;
  continueLabel?: string;
  defaultChannelId?: PaymentChannelCode | null;
  disabled?: boolean;
  onContinue?: (channel: PaymentChannel) => void;
  onSelectedChannelChange?: (channel: PaymentChannel) => void;
  selectedChannelId?: PaymentChannelCode | null;
};

function channelMatchesSearch(channel: PaymentChannel, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    channel.categoryLabel,
    channel.description,
    channel.id,
    channel.name,
    channel.shortName,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function filterPaymentChannels(
  channels: readonly PaymentChannel[],
  query: string,
): PaymentChannel[] {
  return channels.filter((channel) => channelMatchesSearch(channel, query));
}

function groupChannels(channels: readonly PaymentChannel[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    channels: channels.filter((channel) => channel.category === category),
    label: CHANNELS_BY_CATEGORY[category][0]?.categoryLabel ?? category,
  })).filter((group) => group.channels.length > 0);
}

export function PaymentMethodSelector({
  channels = ALL_PAYMENT_CHANNELS,
  className,
  continueLabel = "Continue",
  defaultChannelId = "bca",
  disabled = false,
  onContinue,
  onSelectedChannelChange,
  selectedChannelId,
}: PaymentMethodSelectorProps) {
  const [internalSelectedId, setInternalSelectedId] =
    useState<PaymentChannelCode | null>(defaultChannelId);
  const [query, setQuery] = useState("");
  const activeSelectedId = selectedChannelId ?? internalSelectedId;
  const selectedChannel = channels.find(
    (channel) => channel.id === activeSelectedId,
  );
  const visibleChannels = useMemo(
    () => filterPaymentChannels(channels, query),
    [channels, query],
  );
  const groupedChannels = useMemo(
    () => groupChannels(visibleChannels),
    [visibleChannels],
  );

  function handleSelect(channel: PaymentChannel) {
    if (disabled) return;

    setInternalSelectedId(channel.id);
    onSelectedChannelChange?.(channel);
  }

  function handleContinue() {
    if (!selectedChannel || disabled) return;

    onContinue?.(selectedChannel);
  }

  return (
    <section className={cn("space-y-4", className)} aria-label="Payment method">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label="Search payment methods"
          className="h-10 pl-9"
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search payment methods"
          value={query}
        />
      </div>

      <div className="space-y-5">
        {groupedChannels.map((group) => {
          const Icon = CATEGORY_ICONS[group.category];
          const firstChannel = group.channels[0];

          return (
            <section key={group.category} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon className="size-4" aria-hidden="true" />
                  {group.label}
                </h3>
                {firstChannel ? (
                  <span className="text-xs text-muted-foreground">
                    {firstChannel.estimatedProcessingTime}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.channels.map((channel) => (
                  <PaymentChannelChip
                    key={channel.id}
                    channel={channel}
                    disabled={disabled || !channel.enabled}
                    onSelect={handleSelect}
                    selected={channel.id === activeSelectedId}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {visibleChannels.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No payment methods match your search.
        </p>
      ) : null}

      <Button
        type="button"
        className="h-10 w-full"
        disabled={disabled || !selectedChannel}
        onClick={handleContinue}
      >
        {continueLabel}
      </Button>
    </section>
  );
}
