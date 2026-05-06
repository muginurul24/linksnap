import {
  AddressNotFoundError,
  Reader,
  type ReaderModel,
} from "@maxmind/geoip2-node";

export type EdgeGeoHeaders = {
  city: string | null;
  country: string | null;
};

export type GeoLookupResult = EdgeGeoHeaders & {
  source: "edge" | "maxmind" | "none";
};

let readerPromise: Promise<ReaderModel | null> | null = null;

function getMaxMindDbPath(): string | null {
  return process.env.MAXMIND_DB_PATH?.trim() || null;
}

async function getMaxMindReader(): Promise<ReaderModel | null> {
  const dbPath = getMaxMindDbPath();
  if (!dbPath) return null;

  readerPromise ??= Reader.open(dbPath).catch((error: unknown) => {
    readerPromise = null;
    console.error("[geo] unable to open MaxMind database", error);
    return null;
  });

  return readerPromise;
}

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
  };
}

export async function lookupGeoLocation({
  edgeGeo,
  ipAddress,
}: {
  edgeGeo: EdgeGeoHeaders;
  ipAddress: string | null;
}): Promise<GeoLookupResult> {
  const reader = await getMaxMindReader();

  if (reader && ipAddress) {
    try {
      const response = reader.city(ipAddress);
      return {
        city: response.city?.names.en ?? edgeGeo.city,
        country:
          response.country?.isoCode ??
          response.registeredCountry?.isoCode ??
          edgeGeo.country,
        source: "maxmind",
      };
    } catch (error) {
      if (!(error instanceof AddressNotFoundError)) {
        console.error("[geo] MaxMind lookup failed", error);
      }
    }
  }

  if (edgeGeo.city || edgeGeo.country) {
    return { ...edgeGeo, source: "edge" };
  }

  return { city: null, country: null, source: "none" };
}
