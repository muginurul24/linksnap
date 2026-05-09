import { isIP } from "node:net";
import {
  AddressNotFoundError,
  Reader,
  type ReaderModel,
} from "@maxmind/geoip2-node";
import { logger } from "@/lib/observability/logger";
import { cacheGet, cacheSet } from "@/lib/redis";

export type GeoIpLocation = {
  city: string | null;
  country: string | null;
  region: string | null;
};

export const GEO_IP_CACHE_TTL_SECONDS = 60 * 60 * 24;

let readerPath: string | null = null;
let readerPromise: Promise<ReaderModel | null> | null = null;

export function getGeoIpCacheKey(ipAddress: string): string {
  return `geo:${ipAddress}`;
}

function getMaxMindDbPath(): string | null {
  return process.env.MAXMIND_DB_PATH?.trim() || null;
}

async function getMaxMindReader(): Promise<ReaderModel | null> {
  const dbPath = getMaxMindDbPath();
  if (!dbPath) {
    readerPath = null;
    readerPromise = null;
    return null;
  }

  if (readerPath !== dbPath) {
    readerPath = dbPath;
    readerPromise = Reader.open(dbPath).catch((error: unknown) => {
      readerPath = null;
      readerPromise = null;
      logger.error("geoip_maxmind_open_failed", { error, dbPath });
      return null;
    });
  }

  return readerPromise;
}

function parseIpv4Address(ipAddress: string): number[] | null {
  const parts = ipAddress.split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => Number(part));
  return octets.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
  )
    ? octets
    : null;
}

function getIpv4Address(ipAddress: string): number[] | null {
  if (isIP(ipAddress) === 4) return parseIpv4Address(ipAddress);

  const ipv4MappedPrefix = "::ffff:";
  if (ipAddress.toLowerCase().startsWith(ipv4MappedPrefix)) {
    return parseIpv4Address(ipAddress.slice(ipv4MappedPrefix.length));
  }

  return null;
}

function isPrivateIpv4([first, second]: number[]): boolean {
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254)
  );
}

function isPrivateIpv6(ipAddress: string): boolean {
  const normalized = ipAddress.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  );
}

export function isLocalOrPrivateIpAddress(ipAddress: string | null): boolean {
  if (!ipAddress || !isIP(ipAddress)) return true;

  const ipv4Address = getIpv4Address(ipAddress);
  if (ipv4Address) return isPrivateIpv4(ipv4Address);

  return isPrivateIpv6(ipAddress);
}

export async function lookupGeoIp(
  ipAddress: string | null,
): Promise<GeoIpLocation | null> {
  if (!ipAddress || isLocalOrPrivateIpAddress(ipAddress)) return null;

  const cacheKey = getGeoIpCacheKey(ipAddress);
  const cached = await cacheGet<GeoIpLocation>(cacheKey);
  if (cached) return cached;

  const reader = await getMaxMindReader();
  if (!reader) return null;

  try {
    const response = reader.city(ipAddress);
    const location = {
      city: response.city?.names.en ?? null,
      country:
        response.country?.isoCode ?? response.registeredCountry?.isoCode ?? null,
      region:
        response.subdivisions?.[0]?.isoCode ??
        response.subdivisions?.[0]?.names.en ??
        null,
    };

    await cacheSet(cacheKey, location, GEO_IP_CACHE_TTL_SECONDS);

    return location;
  } catch (error) {
    if (!(error instanceof AddressNotFoundError)) {
      logger.error("geoip_maxmind_lookup_failed", { error });
    }
  }

  return null;
}
