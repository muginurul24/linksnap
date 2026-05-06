import { createHash } from "node:crypto";
import { isIP } from "node:net";

const CLIENT_IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "x-vercel-forwarded-for",
] as const;

export function normalizeIpAddress(value: string | null | undefined): string | null {
  const firstValue = value?.split(",")[0]?.trim();
  if (!firstValue) return null;

  if (firstValue.startsWith("[")) {
    const closingBracketIndex = firstValue.indexOf("]");
    if (closingBracketIndex > 1) {
      const ipv6 = firstValue.slice(1, closingBracketIndex);
      return isIP(ipv6) ? ipv6 : null;
    }
  }

  const withoutPort =
    firstValue.includes(".") && firstValue.includes(":")
      ? firstValue.slice(0, firstValue.lastIndexOf(":"))
      : firstValue;

  return isIP(withoutPort) ? withoutPort : null;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  for (const header of CLIENT_IP_HEADERS) {
    const ipAddress = normalizeIpAddress(headers.get(header));
    if (ipAddress) return ipAddress;
  }

  return null;
}

function getIpHashSalt(): string | null {
  return process.env.IP_HASH_SALT?.trim() || null;
}

export function hashIpAddress(
  ipAddress: string | null,
  salt = getIpHashSalt(),
): string | null {
  if (!ipAddress || !salt) return null;

  return createHash("sha256").update(`${ipAddress}:${salt}`).digest("hex");
}
