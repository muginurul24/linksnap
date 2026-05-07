"use client";

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
      {children}
    </CspNonceContext.Provider>
  );
}

export function useCspNonce(): string | undefined {
  return useContext(CspNonceContext) ?? undefined;
}
