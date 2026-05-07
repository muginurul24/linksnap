import { getClientIpFromHeaders } from "@/lib/analytics/ip";
import { lookupGeoLocation, readEdgeGeoHeaders } from "@/lib/geo/ip-lookup";

export type PaymentGatewayOption = "midtrans";

export function getAvailablePaymentGateways(
  _clientCountry: string | null,
): PaymentGatewayOption[] {
  void _clientCountry;
  return ["midtrans"];
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
