"use client";

import { CSPProvider as BaseUiCspProvider } from "@base-ui/react/csp-provider";
import { createContext, useContext } from "react";

const CspNonceContext = createContext<string | null>(null);

export function CspNonceProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce: string | null;
}) {
  return (
    <CspNonceContext.Provider value={nonce}>
      <BaseUiCspProvider nonce={nonce ?? undefined}>
        {children}
      </BaseUiCspProvider>
    </CspNonceContext.Provider>
  );
}

export function useCspNonce(): string | undefined {
  return useContext(CspNonceContext) ?? undefined;
}
