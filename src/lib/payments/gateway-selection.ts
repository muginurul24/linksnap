import { getClientIpFromHeaders } from "@/lib/analytics/ip";
import { lookupGeoLocation, readEdgeGeoHeaders } from "@/lib/geo/ip-lookup";

export type PaymentGatewayOption = "midtrans" | "stripe";

export function getAvailablePaymentGateways(
  clientCountry: string | null,
): PaymentGatewayOption[] {
  return clientCountry === "ID" ? ["midtrans", "stripe"] : ["stripe"];
}

export async function detectBillingClientCountry(
  requestHeaders: Headers,
): Promise<string | null> {
  const location = await lookupGeoLocation({
    edgeGeo: readEdgeGeoHeaders(requestHeaders),
    ipAddress: getClientIpFromHeaders(requestHeaders),
  });

  return location.country;
}
