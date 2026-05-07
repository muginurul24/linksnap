import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { findLinkById, getUserPlanById, type LinkDetail } from "@/lib/db/queries/links";
import {
  deleteSmartRuleForLink,
  listSmartRulesByLinkId,
  replaceSmartRulesForLink,
} from "@/lib/db/queries/smart-rules";
import {
  exceedsSmartRuleQuota,
  getApiEndpointRateLimit,
  getSmartRuleQuota,
  type UserPlan,
} from "@/lib/links/limits";
import { getRedirectCacheKey } from "@/lib/links/redirect";
import { cacheDelete } from "@/lib/redis";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { linkIdParamsSchema, type LinkIdParams } from "@/lib/validations/link";
import {
  deleteSmartRuleQuerySchema,
  smartRuleV2Schema,
  toPersistedSmartRulesV2,
  upsertSmartRulesSchema,
  upsertSmartRulesV2Schema,
  type DeleteSmartRuleQuery,
  type SmartRuleV2Input,
} from "@/lib/validations/smart-rule";
import { getSmartRulesCacheKey } from "@/lib/rules/rule-engine";

type SmartRulesRouteContext = {
  params: Promise<{ id: string }>;
};

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

class LinkNotFoundError extends Error {
  constructor() {
    super("Link not found.");
  }
}

class LinkForbiddenError extends Error {
  constructor() {
    super("Link is owned by another user.");
  }
}

type ParsedSmartRulesPayload =
  | {
      fallbackDestinationUrl: string | null;
      format: "v2";
      quotaCount: number;
      rules: Parameters<typeof replaceSmartRulesForLink>[0]["rules"];
    }
  | {
      fallbackDestinationUrl: null;
      format: "legacy";
      quotaCount: number;
      rules: Parameters<typeof replaceSmartRulesForLink>[0]["rules"];
    };

type SmartRuleV2Response = SmartRuleV2Input & {
  id: string;
  priority: number;
};

class SmartRuleQuotaExceededError extends Error {
  constructor(public readonly quota: number) {
    super("Smart Rule quota exceeded.");
  }
}

class SmartRuleNotFoundError extends Error {
  constructor() {
    super("Smart Rule not found.");
  }
}

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function parseParams(
  context: SmartRulesRouteContext,
  requestId: string,
): Promise<{ params: LinkIdParams } | { response: Response }> {
  const parsed = linkIdParamsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid link ID.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { params: parsed.data };
}

function parseDeleteQuery(
  request: NextRequest,
  requestId: string,
): { query: DeleteSmartRuleQuery } | { response: Response } {
  const parsed = deleteSmartRuleQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid Smart Rule query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

async function getAuthenticatedUser(
  method: string,
  requestId: string,
): Promise<{ userId: string; userPlan: UserPlan } | { response: Response }> {
  const session = await auth();
  const userId = getSessionUserId(session);

  if (!userId) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      ),
    };
  }

  const userPlan = await getUserPlanById(userId);
  if (!userPlan) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      ),
    };
  }

  const rateLimit = await slidingWindowRateLimit({
    key: `api:links:rules:${method.toLowerCase()}:${userId}`,
    limit: getApiEndpointRateLimit(userPlan),
    windowSeconds: 60,
  });

  if (rateLimit.limited) {
    return {
      response: errorResponse(
        "RATE_LIMITED",
        "Too many API requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      ),
    };
  }

  return { userId, userPlan };
}

async function getAuthorizedLink(id: string, userId: string): Promise<LinkDetail> {
  const link = await findLinkById(id);

  if (!link) throw new LinkNotFoundError();
  if (link.userId !== userId) throw new LinkForbiddenError();

  return link;
}

function assertSmartRuleQuota(ruleCount: number, userPlan: UserPlan): void {
  if (!exceedsSmartRuleQuota(userPlan, ruleCount)) return;

  throw new SmartRuleQuotaExceededError(getSmartRuleQuota(userPlan));
}

function getV2Payload(rule: { condition: unknown }) {
  if (typeof rule.condition !== "object" || rule.condition === null) return null;
  if (Array.isArray(rule.condition)) return null;

  const condition = rule.condition as Record<string, unknown>;
  const parsed = zodSafeV2Payload(condition);
  return parsed;
}

function zodSafeV2Payload(condition: Record<string, unknown>) {
  if (condition.fallbackOnly === true && Array.isArray(condition.conditions)) {
    return {
      conditions: [],
      fallbackDestinationUrl:
        typeof condition.fallbackDestinationUrl === "string"
          ? condition.fallbackDestinationUrl
          : null,
      fallbackOnly: true,
      isActive: false,
    };
  }

  const rules = smartRuleV2Schema.shape.conditions.safeParse(condition.conditions);
  if (!rules.success) return null;

  return {
    conditions: rules.data,
    fallbackDestinationUrl:
      typeof condition.fallbackDestinationUrl === "string"
        ? condition.fallbackDestinationUrl
        : null,
    fallbackOnly: condition.fallbackOnly === true,
    isActive:
      typeof condition.isActive === "boolean" ? condition.isActive : true,
  };
}

function serializeRulesForResponse(rules: Awaited<ReturnType<typeof listSmartRulesByLinkId>>) {
  const v2Rules: SmartRuleV2Response[] = [];
  let fallbackDestinationUrl: string | null = null;
  let sawV2Rule = false;

  for (const rule of rules) {
    const payload = getV2Payload(rule);
    if (!payload) continue;

    sawV2Rule = true;
    fallbackDestinationUrl ??= payload.fallbackDestinationUrl;
    if (payload.fallbackOnly) continue;

    v2Rules.push({
      conditions: payload.conditions,
      destinationUrl: rule.destinationUrl,
      id: rule.id,
      isActive: payload.isActive,
      priority: rule.priority,
    });
  }

  if (!sawV2Rule) {
    return {
      fallbackDestinationUrl: null,
      format: "legacy" as const,
      rules,
    };
  }

  return {
    fallbackDestinationUrl,
    format: "v2" as const,
    rules: v2Rules,
  };
}

function parseSmartRulesPayload(
  body: unknown,
): { data: ParsedSmartRulesPayload } | { error: Record<string, unknown> } {
  const parsedV2 = upsertSmartRulesV2Schema.safeParse(body);
  if (parsedV2.success) {
    return {
      data: {
        fallbackDestinationUrl: parsedV2.data.fallbackDestinationUrl ?? null,
        format: "v2",
        quotaCount: parsedV2.data.rules.length,
        rules: toPersistedSmartRulesV2(parsedV2.data),
      },
    };
  }

  const parsedLegacy = upsertSmartRulesSchema.safeParse(body);
  if (parsedLegacy.success) {
    return {
      data: {
        fallbackDestinationUrl: null,
        format: "legacy",
        quotaCount: parsedLegacy.data.rules.length,
        rules: parsedLegacy.data.rules,
      },
    };
  }

  return { error: parsedV2.error.flatten() as Record<string, unknown> };
}

function handleKnownError(error: unknown, requestId: string): Response | null {
  if (error instanceof LinkNotFoundError) {
    return errorResponse("LINK_NOT_FOUND", "Link not found.", 404, requestId);
  }

  if (error instanceof LinkForbiddenError) {
    return errorResponse("FORBIDDEN", "You do not have access to this link.", 403, requestId);
  }

  if (error instanceof SmartRuleQuotaExceededError) {
    return errorResponse(
      "SMART_RULE_QUOTA_EXCEEDED",
      "Smart Rule quota exceeded.",
      403,
      requestId,
      { quota: error.quota },
    );
  }

  if (error instanceof SmartRuleNotFoundError) {
    return errorResponse(
      "SMART_RULE_NOT_FOUND",
      "Smart Rule not found.",
      404,
      requestId,
    );
  }

  return null;
}

async function invalidateSmartRuleCaches(slug: string): Promise<void> {
  await Promise.all([
    cacheDelete(getRedirectCacheKey(slug)),
    cacheDelete(getSmartRulesCacheKey(slug)),
  ]);
}

export async function GET(_request: NextRequest, context: SmartRulesRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const rules = await listSmartRulesByLinkId(link.id);

    return successResponse({ linkId: link.id, ...serializeRulesForResponse(rules) });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/[id]/rules" });
    return errorResponse("INTERNAL_ERROR", "Unable to get Smart Rules.", 500, requestId);
  }
}

async function upsertRules(
  request: NextRequest,
  context: SmartRulesRouteContext,
  method: "POST" | "PUT",
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(method, requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = parseSmartRulesPayload(body);
    if ("error" in parsedBody) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid Smart Rules input.",
        400,
        requestId,
        parsedBody.error,
      );
    }

    assertSmartRuleQuota(parsedBody.data.quotaCount, authResult.userPlan);

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const rules = await replaceSmartRulesForLink({
      linkId: link.id,
      rules: parsedBody.data.rules,
    });
    await invalidateSmartRuleCaches(link.slug);

    return successResponse({ linkId: link.id, ...serializeRulesForResponse(rules) });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId,
      route: `${method} /api/v1/links/[id]/rules`,
    });
    return errorResponse("INTERNAL_ERROR", "Unable to save Smart Rules.", 500, requestId);
  }
}

export async function POST(request: NextRequest, context: SmartRulesRouteContext) {
  return upsertRules(request, context, "POST");
}

export async function PUT(request: NextRequest, context: SmartRulesRouteContext) {
  return upsertRules(request, context, "PUT");
}

export async function DELETE(request: NextRequest, context: SmartRulesRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("DELETE", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const parsedQuery = parseDeleteQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const deleted = await deleteSmartRuleForLink({
      linkId: link.id,
      ruleId: parsedQuery.query.ruleId,
    });
    if (!deleted) throw new SmartRuleNotFoundError();

    await invalidateSmartRuleCaches(link.slug);

    return successResponse({ deleted: true, ruleId: deleted.id });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "DELETE /api/v1/links/[id]/rules" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to delete Smart Rule.",
      500,
      requestId,
    );
  }
}
