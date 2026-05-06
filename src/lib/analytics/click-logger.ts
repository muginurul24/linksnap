import { insertClickEvents } from "@/lib/db/queries/click-events";
import {
  readEdgeGeoHeaders,
  lookupGeoLocation,
  type EdgeGeoHeaders,
} from "@/lib/geo/ip-lookup";
import { getClientIpFromHeaders, hashIpAddress } from "@/lib/analytics/ip";
import { parseUserAgent } from "@/lib/analytics/user-agent";

export type RedirectClickInput = {
  edgeGeo: EdgeGeoHeaders;
  ipAddress: string | null;
  linkId: string;
  referrer: string | null;
  userAgent: string | null;
};

export function buildRedirectClickInput(
  linkId: string,
  headers: Headers,
): RedirectClickInput {
  return {
    edgeGeo: readEdgeGeoHeaders(headers),
    ipAddress: getClientIpFromHeaders(headers),
    linkId,
    referrer: headers.get("referer"),
    userAgent: headers.get("user-agent"),
  };
}

export async function logRedirectClick({
  edgeGeo,
  ipAddress,
  linkId,
  referrer,
  userAgent,
}: RedirectClickInput): Promise<void> {
  try {
    const geo = await lookupGeoLocation({ edgeGeo, ipAddress });
    const parsedUserAgent = parseUserAgent(userAgent);

    await insertClickEvents([
      {
        browser: parsedUserAgent.browser,
        city: geo.city,
        country: geo.country,
        device: parsedUserAgent.device,
        ipHash: hashIpAddress(ipAddress),
        linkId,
        os: parsedUserAgent.os,
        referrer,
        userAgent,
      },
    ]);
  } catch (error) {
    console.error("[click-logger] failed to log redirect click", error);
  }
}
