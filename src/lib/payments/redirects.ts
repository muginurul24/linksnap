export type PaymentRedirectUrls = {
  error: string;
  finish: string;
  unfinish: string;
};

type BuildPaymentRedirectUrlsInput = {
  baseUrl: string;
  orderId: string;
};

export function normalizePaymentBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return "https://www.justqiu.cloud";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "https://www.justqiu.cloud";
    }

    return parsed.origin;
  } catch {
    return "https://www.justqiu.cloud";
  }
}

export function getConfiguredPaymentBaseUrl(): string | null {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) return normalizePaymentBaseUrl(appUrl);

  const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicAppUrl) return normalizePaymentBaseUrl(publicAppUrl);

  return null;
}

export function buildPaymentRedirectUrls({
  baseUrl,
  orderId,
}: BuildPaymentRedirectUrlsInput): PaymentRedirectUrls {
  const normalizedBaseUrl = normalizePaymentBaseUrl(baseUrl);
  const encodedOrderId = encodeURIComponent(orderId);

  return {
    error: `${normalizedBaseUrl}/checkout/cancel?order_id=${encodedOrderId}&status=error`,
    finish: `${normalizedBaseUrl}/checkout/success?order_id=${encodedOrderId}`,
    unfinish: `${normalizedBaseUrl}/checkout/cancel?order_id=${encodedOrderId}&status=unfinish`,
  };
}
