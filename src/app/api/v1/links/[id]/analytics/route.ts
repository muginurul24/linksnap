import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  AnalyticsDateRangeError,
  normalizeAnalyticsDateRange,
  summarizeClickEvents,
} from "@/lib/analytics/summary";
import { listClickEventsForLink } from "@/lib/db/queries/click-events";
import {
  findLinkById,
  getUserPlanById,
  type LinkDetail,
} from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  linkAnalyticsQuerySchema,
  linkIdParamsSchema,
  type LinkAnalyticsQuery,
  type LinkIdParams,
} from "@/lib/validations/link";

type LinkAnalyticsRouteContext = {
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

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function parseParams(
  context: LinkAnalyticsRouteContext,
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

function parseQuery(
  request: NextRequest,
  requestId: string,
): { query: LinkAnalyticsQuery } | { response: Response } {
  const parsed = linkAnalyticsQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid analytics query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

async function getAuthenticatedUser(
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
    key: `api:links:analytics:get:${userId}`,
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

function handleKnownError(error: unknown, requestId: string): Response | null {
  if (error instanceof LinkNotFoundError) {
    return errorResponse("LINK_NOT_FOUND", "Link not found.", 404, requestId);
  }

  if (error instanceof LinkForbiddenError) {
    return errorResponse("FORBIDDEN", "You do not have access to this link.", 403, requestId);
  }

  if (error instanceof AnalyticsDateRangeError) {
    return errorResponse(
      "VALIDATION_ERROR",
      error.message,
      400,
      requestId,
    );
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: LinkAnalyticsRouteContext,
) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const parsedQuery = parseQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const range = normalizeAnalyticsDateRange(parsedQuery.query);
    const events = await listClickEventsForLink({
      from: range.from,
      linkId: link.id,
      to: range.to,
    });
    const summary = summarizeClickEvents(events, range);

    return successResponse({
      ...summary,
      linkId: link.id,
      range: {
        from: range.from,
        to: range.to,
      },
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/[id]/analytics" });
    return errorResponse("INTERNAL_ERROR", "Unable to get link analytics.", 500, requestId);
  }
}
