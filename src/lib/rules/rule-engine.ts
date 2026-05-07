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
  ruleId: string | null;
};

type EvaluateSmartRulesInput = {
  context: RuleEvaluationContext;
  defaultDestinationUrl?: string;
  fallbackDestinationUrl?: string | null;
  linkId: string;
  slug: string;
  smartRulesEnabled?: boolean;
};

const SMART_RULES_CACHE_TTL_SECONDS = 300;
const PREDEFINED_BOT_PATTERNS = [
  "Googlebot",
  "Bingbot",
  "FacebookExternalHit",
  "Twitterbot",
  "Slurp",
  "DuckDuckBot",
  "Baiduspider",
  "YandexBot",
  "AhrefsBot",
  "SemrushBot",
  "GPTBot",
  "Claude-Web",
  "CCBot",
] as const;

type SmartRuleV2Condition = {
  operator: "is" | "is_not";
  type: "bot" | "country" | "device" | "time";
  value: string | string[];
};

type SmartRuleV2Payload = {
  conditions?: SmartRuleV2Condition[];
  fallbackDestinationUrl?: string;
  fallbackOnly?: boolean;
  isActive?: boolean;
  version?: 2;
};

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

function getV2Payload(rule: SmartRuleRecord): SmartRuleV2Payload | null {
  const condition = asRecord(rule.condition);
  if (!condition) return null;
  if (!Array.isArray(condition.conditions)) return null;

  return {
    conditions: condition.conditions.filter(isV2Condition),
    fallbackDestinationUrl:
      getString(condition, ["fallbackDestinationUrl"]) ?? undefined,
    fallbackOnly: condition.fallbackOnly === true,
    isActive:
      typeof condition.isActive === "boolean" ? condition.isActive : undefined,
    version: condition.version === 2 ? 2 : undefined,
  };
}

function isV2Condition(value: unknown): value is SmartRuleV2Condition {
  const condition = asRecord(value);
  if (!condition) return false;

  const type = condition.type;
  const operator = condition.operator;
  const valueField = condition.value;

  return (
    (type === "country" || type === "device" || type === "bot" || type === "time") &&
    (operator === "is" || operator === "is_not") &&
    (typeof valueField === "string" ||
      (Array.isArray(valueField) &&
        valueField.every((item) => typeof item === "string")))
  );
}

function getConditionValues(value: string | string[]): string[] {
  const values = Array.isArray(value) ? value : [value];

  return values.map((item) => item.trim()).filter(Boolean);
}

export function isBotUserAgent(
  userAgent: string | null,
  patterns: readonly string[] = PREDEFINED_BOT_PATTERNS,
): boolean {
  const normalizedUserAgent = userAgent?.toLowerCase() ?? "";
  if (!normalizedUserAgent) return false;

  return patterns.some((pattern) =>
    normalizedUserAgent.includes(pattern.toLowerCase()),
  );
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

async function matchesV2CountryCondition(
  condition: SmartRuleV2Condition,
  context: RuleEvaluationContext,
): Promise<boolean> {
  const geo = await lookupGeoLocation({
    edgeGeo: context.edgeGeo,
    ipAddress: context.ipAddress,
  });

  return matchesAny(geo.country, getConditionValues(condition.value));
}

function matchesV2DeviceCondition(
  condition: SmartRuleV2Condition,
  context: RuleEvaluationContext,
): boolean {
  const parsed = parseUserAgent(context.userAgent);

  return matchesAny(parsed.device, getConditionValues(condition.value));
}

function matchesV2BotCondition(
  condition: SmartRuleV2Condition,
  context: RuleEvaluationContext,
): boolean {
  return isBotUserAgent(context.userAgent, getConditionValues(condition.value));
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

function matchesV2TimeCondition(
  condition: SmartRuleV2Condition,
  context: RuleEvaluationContext,
): boolean {
  const [startValue, endValue] = getConditionValues(condition.value);
  const start = parseDateCondition(startValue);
  const end = parseDateCondition(endValue);
  if (!start || !end) return false;

  return context.timestamp >= start && context.timestamp <= end;
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
  const v2Payload = getV2Payload(rule);
  if (v2Payload) return v2RuleMatches(v2Payload, context);

  if (rule.type === "GEO") return matchesGeoCondition(rule, context);
  if (rule.type === "DEVICE") return matchesDeviceCondition(rule, context);
  if (rule.type === "TIME") return matchesTimeCondition(rule, context);
  if (rule.type === "LANGUAGE") return matchesLanguageCondition(rule, context);

  return false;
}

async function v2ConditionMatches(
  condition: SmartRuleV2Condition,
  context: RuleEvaluationContext,
): Promise<boolean> {
  let matched = false;

  if (condition.type === "country") {
    matched = await matchesV2CountryCondition(condition, context);
  }
  if (condition.type === "device") {
    matched = matchesV2DeviceCondition(condition, context);
  }
  if (condition.type === "bot") {
    matched = matchesV2BotCondition(condition, context);
  }
  if (condition.type === "time") {
    matched = matchesV2TimeCondition(condition, context);
  }

  return condition.operator === "is_not" ? !matched : matched;
}

async function v2RuleMatches(
  payload: SmartRuleV2Payload,
  context: RuleEvaluationContext,
): Promise<boolean> {
  if (payload.fallbackOnly || payload.isActive === false) return false;
  if (!payload.conditions || payload.conditions.length === 0) return false;

  for (const condition of payload.conditions) {
    if (!(await v2ConditionMatches(condition, context))) return false;
  }

  return true;
}

function getFallbackDestinationFromRules(rules: SmartRuleRecord[]): string | null {
  for (const rule of rules) {
    const payload = getV2Payload(rule);
    if (payload?.fallbackDestinationUrl) return payload.fallbackDestinationUrl;
  }

  return null;
}

function hasV2RulePayload(rules: SmartRuleRecord[]): boolean {
  return rules.some((rule) => getV2Payload(rule) !== null);
}

export async function evaluateSmartRulesForLink({
  context,
  defaultDestinationUrl,
  fallbackDestinationUrl,
  linkId,
  slug,
  smartRulesEnabled,
}: EvaluateSmartRulesInput): Promise<RuleEvaluationResult | null> {
  if (smartRulesEnabled === false && defaultDestinationUrl) {
    return { destinationUrl: defaultDestinationUrl, ruleId: null };
  }

  const rules = await getRulesForLink({ linkId, slug });
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    if (await ruleMatches(rule, context)) {
      return {
        destinationUrl: rule.destinationUrl,
        ruleId: rule.id,
      };
    }
  }

  const fallback = fallbackDestinationUrl ?? getFallbackDestinationFromRules(rules);
  if (fallback) return { destinationUrl: fallback, ruleId: null };

  if (
    defaultDestinationUrl &&
    (smartRulesEnabled === true ||
      (smartRulesEnabled !== false && hasV2RulePayload(rules)))
  ) {
    return { destinationUrl: defaultDestinationUrl, ruleId: null };
  }

  return null;
}
