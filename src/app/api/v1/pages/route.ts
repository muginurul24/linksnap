import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authenticateApiKeyRequest } from "@/lib/auth/api-key";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  createListMeta,
  parseCreatedAtCursorParam,
} from "@/lib/api/pagination";
import {
  getUserPlanById,
  listLinkPagesByUserIdPaginated,
  type ListedLinkPage,
} from "@/lib/db/queries/links";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  listPagesQuerySchema,
  type ListPagesQuery,
} from "@/lib/validations/link";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

async function getAuthenticatedUser(
  request: NextRequest,
  requestId: string,
): Promise<{ userId: string; userPlan: UserPlan } | { response: Response }> {
  const apiKeyAuth = await authenticateApiKeyRequest(request);
  if (apiKeyAuth) {
    return {
      userId: apiKeyAuth.userId,
      userPlan: apiKeyAuth.userPlan,
    };
  }

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

  return { userId, userPlan };
}

async function checkRateLimit({
  requestId,
  userId,
  userPlan,
}: {
  requestId: string;
  userId: string;
  userPlan: UserPlan;
}): Promise<Response | null> {
  const rateLimit = await slidingWindowRateLimit({
    key: `api:pages:list:${userId}`,
    limit: getApiEndpointRateLimit(userPlan),
    windowSeconds: 60,
  });

  if (!rateLimit.limited) return null;

  return errorResponse(
    "RATE_LIMITED",
    "Too many API requests.",
    429,
    requestId,
    { retryAfter: rateLimit.retryAfter },
  );
}

function formatLinkPage(page: ListedLinkPage) {
  return {
    brandName: page.brandName,
    createdAt: page.createdAt.toISOString(),
    ctaClicks: page.ctaClicks,
    ctaText: page.ctaText,
    hasCountdown: page.hasCountdown,
    id: page.id,
    isActive: page.isActive,
    linkId: page.linkId,
    pageViews: page.pageViews,
    showQrCode: page.showQrCode,
    slug: page.slug,
    title: page.title,
    updatedAt: page.updatedAt.toISOString(),
  };
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

function parseListQuery(
  request: NextRequest,
  requestId: string,
): { query: ListPagesQuery } | { response: Response } {
  const parsed = listPagesQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid Link Page list query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const rateLimit = await checkRateLimit({
      requestId,
      userId: authResult.userId,
      userPlan: authResult.userPlan,
    });
    if (rateLimit) return rateLimit;

    const parsedQuery = parseListQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const parsedCursor = parseCreatedAtCursorParam(
      parsedQuery.query.cursor,
      requestId,
    );
    if ("response" in parsedCursor) return parsedCursor.response;

    const { items, nextCursor, total } = await listLinkPagesByUserIdPaginated({
      ...parsedQuery.query,
      cursor: parsedCursor.cursor,
      userId: authResult.userId,
    });

    return successResponse(
      items.map(formatLinkPage),
      200,
      createListMeta({
        cursor: parsedQuery.query.cursor,
        limit: parsedQuery.query.limit,
        nextCursor,
        page: parsedQuery.query.page,
        total,
      }),
    );
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/pages" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to list Link Pages.",
      500,
      requestId,
    );
  }
}
