import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { findLinkById, getUserPlanById, type LinkDetail } from "@/lib/db/queries/links";
import {
  deleteSplitTestForLink,
  findSplitTestByLinkId,
  upsertSplitTestForLink,
  type SplitTestRecord,
} from "@/lib/db/queries/split-tests";
import { getApiEndpointRateLimit, type UserPlan } from "@/lib/links/limits";
import { getRedirectCacheKey } from "@/lib/links/redirect";
import { cacheDelete } from "@/lib/redis";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { linkIdParamsSchema, type LinkIdParams } from "@/lib/validations/link";
import { upsertSplitTestSchema } from "@/lib/validations/split-test";

type SplitTestRouteContext = {
  params: Promise<{ id: string }>;
};

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

function formatSplitTest(splitTest: SplitTestRecord | null) {
  if (!splitTest) return null;

  const totalVariantClicks = splitTest.variants.reduce(
    (total, variant) => total + variant.clickCount,
    0,
  );

  return {
    createdAt: splitTest.createdAt,
    id: splitTest.id,
    isActive: splitTest.isActive,
    linkId: splitTest.linkId,
    performance: {
      totalVariantClicks,
      variants: splitTest.variants.map((variant) => ({
        clickCount: variant.clickCount,
        id: variant.id,
      })),
    },
    variants: splitTest.variants,
  };
}

async function parseParams(
  context: SplitTestRouteContext,
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
    key: `api:links:split-test:${method.toLowerCase()}:${userId}`,
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

  return null;
}

async function invalidateRedirectCache(slug: string): Promise<void> {
  await cacheDelete(getRedirectCacheKey(slug));
}

export async function GET(
  _request: NextRequest,
  context: SplitTestRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const splitTest = await findSplitTestByLinkId(link.id);

    return successResponse({
      linkId: link.id,
      splitTest: formatSplitTest(splitTest),
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/[id]/split-test" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to get split test.",
      500,
      requestId,
    );
  }
}

export async function POST(
  request: NextRequest,
  context: SplitTestRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("POST", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = upsertSplitTestSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid split test input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const splitTest = await upsertSplitTestForLink({
      linkId: link.id,
      variants: parsedBody.data.variants,
    });

    await invalidateRedirectCache(link.slug);

    return successResponse(formatSplitTest(splitTest));
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/links/[id]/split-test" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to save split test.",
      500,
      requestId,
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: SplitTestRouteContext,
): Promise<Response> {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("DELETE", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const deleted = await deleteSplitTestForLink(link.id);

    await invalidateRedirectCache(link.slug);

    return successResponse({
      deleted: Boolean(deleted),
      id: deleted?.id ?? null,
      linkId: link.id,
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "DELETE /api/v1/links/[id]/split-test" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to delete split test.",
      500,
      requestId,
    );
  }
}
