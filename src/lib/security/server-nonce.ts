import { headers } from "next/headers";
import { CSP_NONCE_HEADER } from "@/lib/security/headers";

export async function getCspNonce(): Promise<string | undefined> {
  try {
    return (await headers()).get(CSP_NONCE_HEADER) ?? undefined;
  } catch {
    return undefined;
  }
}
