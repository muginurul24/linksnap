"use client";

import { useCspNonce } from "@/components/security/nonce-provider";

export function NoncedStyle({ css }: { css: string }) {
  const nonce = useCspNonce();

  return (
    <style nonce={nonce} suppressHydrationWarning>
      {css}
    </style>
  );
}
