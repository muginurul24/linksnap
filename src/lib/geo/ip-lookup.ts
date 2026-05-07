import { lookupGeoIp } from "@/lib/geo/geoip";

export type EdgeGeoHeaders = {
  city: string | null;
  country: string | null;
  region?: string | null;
};

export type GeoLookupResult = {
  city: string | null;
  country: string | null;
  region: string | null;
  source: "edge" | "maxmind" | "none";
};

function normalizeHeaderValue(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function readEdgeGeoHeaders(headers: Headers): EdgeGeoHeaders {
  return {
    city: normalizeHeaderValue(
      headers.get("x-vercel-ip-city") ?? headers.get("cf-ipcity"),
    ),
    country: normalizeHeaderValue(
      headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry"),
    ),
    region: normalizeHeaderValue(
      headers.get("x-vercel-ip-country-region") ??
        headers.get("x-vercel-ip-region") ??
        headers.get("cf-region"),
    ),
  };
}

export async function lookupGeoLocation({
  edgeGeo,
  ipAddress,
}: {
  edgeGeo: EdgeGeoHeaders;
  ipAddress: string | null;
}): Promise<GeoLookupResult> {
  const geoIp = await lookupGeoIp(ipAddress);

  if (geoIp) {
    return {
      city: geoIp.city ?? edgeGeo.city,
      country: geoIp.country ?? edgeGeo.country,
      region: geoIp.region ?? edgeGeo.region ?? null,
      source: "maxmind",
    };
  }

  if (edgeGeo.city || edgeGeo.country || edgeGeo.region) {
    return {
      city: edgeGeo.city,
      country: edgeGeo.country,
      region: edgeGeo.region ?? null,
      source: "edge",
    };
  }

  return { city: null, country: null, region: null, source: "none" };
}
