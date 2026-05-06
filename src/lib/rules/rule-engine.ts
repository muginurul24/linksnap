import { getClientIpFromHeaders } from "@/lib/analytics/ip";
import { parseUserAgent } from "@/lib/analytics/user-agent";
import type { SmartRuleRecord } from "@/lib/db/queries/smart-rules";
import { listSmartRulesByLinkId } from "@/lib/db/queries/smart-rules";
import {
  lookupGeoLocation,
  readEdgeGeoHeaders,
  type EdgeGeoHeaders,
} from "@/lib/geo/ip-lookup";
import { cacheGet, cacheSet } from "@/lib/redis";

export type RuleEvaluationContext = {
  acceptLanguage: string | null;
  edgeGeo: EdgeGeoHeaders;
  ipAddress: string | null;
  timestamp: Date;
  userAgent: string | null;
};

export type RuleEvaluationResult = {
  destinationUrl: string;
  ruleId: string;
};

type EvaluateSmartRulesInput = {
  context: RuleEvaluationContext;
  linkId: string;
  slug: string;
};

const SMART_RULES_CACHE_TTL_SECONDS = 300;

export function getSmartRulesCacheKey(slug: string): string {
  return `smart-rules:${slug}`;
}

export function buildRuleEvaluationContext(
  headers: Headers,
  timestamp = new Date(),
): RuleEvaluationContext {
  return {
    acceptLanguage: headers.get("accept-language"),
    edgeGeo: readEdgeGeoHeaders(headers),
    ipAddress: getClientIpFromHeaders(headers),
    timestamp,
    userAgent: headers.get("user-agent"),
  };
}

async function getRulesForLink({
  linkId,
  slug,
}: {
  linkId: string;
  slug: string;
}): Promise<SmartRuleRecord[]> {
  const cacheKey = getSmartRulesCacheKey(slug);
  const cached = await cacheGet<SmartRuleRecord[]>(cacheKey);
  if (cached) return cached;

  const rules = await listSmartRulesByLinkId(linkId);
  await cacheSet(cacheKey, rules, SMART_RULES_CACHE_TTL_SECONDS);

  return rules;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(condition: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = condition[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

function getStringArray(
  condition: Record<string, unknown>,
  keys: string[],
): string[] {
  for (const key of keys) {
    const value = condition[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  const single = getString(condition, keys);
  return single ? [single] : [];
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function matchesAny(candidate: string | null, allowed: string[]): boolean {
  if (!candidate || allowed.length === 0) return false;

  const normalizedCandidate = normalizeToken(candidate);
  return allowed.some((value) => normalizeToken(value) === normalizedCandidate);
}

async function matchesGeoCondition(
  rule: SmartRuleRecord,
  context: RuleEvaluationContext,
): Promise<boolean> {
  const condition = asRecord(rule.condition);
  if (!condition) return false;

  const geo = await lookupGeoLocation({
    edgeGeo: context.edgeGeo,
    ipAddress: context.ipAddress,
  });
  const countries = getStringArray(condition, ["countries", "country"]);
  const cities = getStringArray(condition, ["cities", "city"]);

  return matchesAny(geo.country, countries) || matchesAny(geo.city, cities);
}

function matchesDeviceCondition(
  rule: SmartRuleRecord,
  context: RuleEvaluationContext,
): boolean {
  const condition = asRecord(rule.condition);
  if (!condition) return false;

  const parsed = parseUserAgent(context.userAgent);
  const devices = getStringArray(condition, ["devices", "device"]);
  const browsers = getStringArray(condition, ["browsers", "browser"]);
  const operatingSystems = getStringArray(condition, ["os", "operatingSystems"]);

  return (
    matchesAny(parsed.device, devices) ||
    matchesAny(parsed.browser, browsers) ||
    matchesAny(parsed.os, operatingSystems)
  );
}

function parseDateCondition(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTimeToMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
}

function getMinutesInTimezone(timestamp: Date, timezone: string | null): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      timeZone: timezone ?? "UTC",
    }).formatToParts(timestamp);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);

    if (Number.isInteger(hour) && Number.isInteger(minute)) {
      return hour * 60 + minute;
    }
  } catch {
    // Invalid time zones fall back to UTC below.
  }

  return timestamp.getUTCHours() * 60 + timestamp.getUTCMinutes();
}

function isWithinMinuteWindow(now: number, start: number, end: number): boolean {
  if (start <= end) return now >= start && now <= end;

  return now >= start || now <= end;
}

function matchesTimeCondition(
  rule: SmartRuleRecord,
  context: RuleEvaluationContext,
): boolean {
  const condition = asRecord(rule.condition);
  if (!condition) return false;

  const from = parseDateCondition(condition.from);
  const to = parseDateCondition(condition.to);
  if (from || to) {
    const afterFrom = from ? context.timestamp >= from : true;
    const beforeTo = to ? context.timestamp <= to : true;
    return afterFrom && beforeTo;
  }

  const start = parseTimeToMinutes(condition.start ?? condition.fromTime);
  const end = parseTimeToMinutes(condition.end ?? condition.toTime);
  if (start === null || end === null) return false;

  const timezone = getString(condition, ["timezone", "timeZone"]);
  const now = getMinutesInTimezone(context.timestamp, timezone);

  return isWithinMinuteWindow(now, start, end);
}

function parseAcceptedLanguages(value: string | null): string[] {
  if (!value) return [];

  return value
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter((part): part is string => Boolean(part));
}

function languageMatches(accepted: string[], allowed: string[]): boolean {
  if (accepted.length === 0 || allowed.length === 0) return false;

  return accepted.some((candidate) =>
    allowed.some((allowedLanguage) => {
      const normalizedAllowed = normalizeToken(allowedLanguage);
      return (
        candidate === normalizedAllowed ||
        candidate.startsWith(`${normalizedAllowed}-`)
      );
    }),
  );
}

function matchesLanguageCondition(
  rule: SmartRuleRecord,
  context: RuleEvaluationContext,
): boolean {
  const condition = asRecord(rule.condition);
  if (!condition) return false;

  return languageMatches(
    parseAcceptedLanguages(context.acceptLanguage),
    getStringArray(condition, ["languages", "language", "locale"]),
  );
}

async function ruleMatches(
  rule: SmartRuleRecord,
  context: RuleEvaluationContext,
): Promise<boolean> {
  if (rule.type === "GEO") return matchesGeoCondition(rule, context);
  if (rule.type === "DEVICE") return matchesDeviceCondition(rule, context);
  if (rule.type === "TIME") return matchesTimeCondition(rule, context);
  if (rule.type === "LANGUAGE") return matchesLanguageCondition(rule, context);

  return false;
}

export async function evaluateSmartRulesForLink({
  context,
  linkId,
  slug,
}: EvaluateSmartRulesInput): Promise<RuleEvaluationResult | null> {
  const rules = await getRulesForLink({ linkId, slug });
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sortedRules) {
    if (await ruleMatches(rule, context)) {
      return {
        destinationUrl: rule.destinationUrl,
        ruleId: rule.id,
      };
    }
  }

  return null;
}
