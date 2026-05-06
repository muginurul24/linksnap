import { insertClickEvents } from "@/lib/db/queries/click-events";
import {
  readEdgeGeoHeaders,
  lookupGeoLocation,
  type EdgeGeoHeaders,
} from "@/lib/geo/ip-lookup";
import { getClientIpFromHeaders, hashIpAddress } from "@/lib/analytics/ip";
import { parseUserAgent } from "@/lib/analytics/user-agent";

export type RedirectClickEventType =
  | "DIRECT_REDIRECT"
  | "LINK_PAGE_CTA_CLICK"
  | "LINK_PAGE_VIEW";

export type RedirectClickInput = {
  edgeGeo: EdgeGeoHeaders;
  eventType: RedirectClickEventType;
  ipAddress: string | null;
  linkId: string;
  linkPageHasCountdown: boolean;
  referrer: string | null;
  userAgent: string | null;
};

export function buildRedirectClickInput(
  linkId: string,
  headers: Headers,
  options: {
    eventType?: RedirectClickEventType;
    linkPageHasCountdown?: boolean;
  } = {},
): RedirectClickInput {
  return {
    edgeGeo: readEdgeGeoHeaders(headers),
    eventType: options.eventType ?? "DIRECT_REDIRECT",
    ipAddress: getClientIpFromHeaders(headers),
    linkId,
    linkPageHasCountdown: options.linkPageHasCountdown ?? false,
    referrer: headers.get("referer"),
    userAgent: headers.get("user-agent"),
  };
}

export async function logRedirectClick({
  edgeGeo,
  eventType,
  ipAddress,
  linkId,
  linkPageHasCountdown,
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
        eventType,
        ipHash: hashIpAddress(ipAddress),
        linkId,
        linkPageHasCountdown,
        os: parsedUserAgent.os,
        referrer,
        userAgent,
      },
    ]);
  } catch (error) {
    console.error("[click-logger] failed to log redirect click", error);
  }
}
