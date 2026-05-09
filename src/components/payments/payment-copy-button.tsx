"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type PaymentCopyButtonProps = {
  disabled?: boolean;
  label?: string;
  value: string | null | undefined;
};

export function PaymentCopyButton({
  disabled = false,
  label = "Copy",
  value,
}: PaymentCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const canCopy = Boolean(value) && !disabled;

  async function handleCopy() {
    if (!value || typeof navigator === "undefined") return;

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleCopy()}
      disabled={!canCopy}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
