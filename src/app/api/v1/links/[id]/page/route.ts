import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getSessionUserId, type SessionWithUserId } from "@/lib/auth/session-helpers";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  countLinkPagesByUserId,
  findLinkById,
  findLinkPageByLinkId,
  getUserPlanById,
  setLinkPageEnabledForUser,
  upsertLinkPageForLink,
  type LinkDetail,
  type LinkPageRecord,
} from "@/lib/db/queries/links";
import {
  getApiEndpointRateLimit,
  hasReachedLinkPageQuota,
  type UserPlan,
} from "@/lib/links/limits";
import { getRedirectCacheKey } from "@/lib/links/redirect";
import { cacheDelete } from "@/lib/redis";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { linkIdParamsSchema, type LinkIdParams } from "@/lib/validations/link";
import {
  upsertLinkPageSchema,
  type UpsertLinkPageInput,
} from "@/lib/validations/link-page";

type LinkPageRouteContext = {
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

class LinkPageQuotaExceededError extends Error {
  constructor() {
    super("Link Page quota exceeded.");
  }
}

function formatLinkPage(page: LinkPageRecord | null) {
  if (!page) return null;

  return {
    brandName: page.brandName,
    countdownTarget: page.countdownTarget,
    ctaColor: page.ctaColor,
    ctaText: page.ctaText,
    description: page.description,
    id: page.id,
    linkId: page.linkId,
    ogImage: page.ogImage,
    showCountdown: page.showCountdown ?? false,
    showQrCode: page.showQrCode ?? true,
    showSocialProof: page.showSocialProof ?? true,
    theme: page.theme,
    title: page.title,
    updatedAt: page.updatedAt,
  };
}

async function parseParams(
  context: LinkPageRouteContext,
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
    key: `api:links:page:${method.toLowerCase()}:${userId}`,
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

async function ensureLinkPageQuota({
  linkId,
  userId,
  userPlan,
}: {
  linkId: string;
  userId: string;
  userPlan: UserPlan;
}): Promise<void> {
  const existingPage = await findLinkPageByLinkId(linkId);
  if (existingPage) return;

  const linkPageCount = await countLinkPagesByUserId(userId);
  if (hasReachedLinkPageQuota(userPlan, linkPageCount)) {
    throw new LinkPageQuotaExceededError();
  }
}

function handleKnownError(error: unknown, requestId: string): Response | null {
  if (error instanceof LinkNotFoundError) {
    return errorResponse("LINK_NOT_FOUND", "Link not found.", 404, requestId);
  }

  if (error instanceof LinkForbiddenError) {
    return errorResponse("FORBIDDEN", "You do not have access to this link.", 403, requestId);
  }

  if (error instanceof LinkPageQuotaExceededError) {
    return errorResponse(
      "LINK_PAGE_QUOTA_EXCEEDED",
      "Link Page quota exceeded.",
      403,
      requestId,
    );
  }

  return null;
}

async function upsertLinkPage(
  linkId: string,
  input: UpsertLinkPageInput,
): Promise<LinkPageRecord> {
  return upsertLinkPageForLink({
    brandName: input.brandName,
    countdownTarget: input.countdownTarget ?? null,
    ctaColor: input.ctaColor,
    ctaText: input.ctaText,
    description: input.description ?? null,
    linkId,
    ogImage: input.ogImage ?? null,
    showCountdown: input.showCountdown,
    showQrCode: input.showQrCode,
    showSocialProof: input.showSocialProof,
    theme: input.theme,
    title: input.title,
  });
}

export async function GET(_request: NextRequest, context: LinkPageRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const page = await findLinkPageByLinkId(parsedParams.params.id);

    return successResponse({
      linkId: parsedParams.params.id,
      linkPage: formatLinkPage(page),
    });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/[id]/page" });
    return errorResponse("INTERNAL_ERROR", "Unable to get Link Page.", 500, requestId);
  }
}

export async function POST(request: NextRequest, context: LinkPageRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("POST", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = upsertLinkPageSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid Link Page input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    await ensureLinkPageQuota({
      linkId: link.id,
      userId: authResult.userId,
      userPlan: authResult.userPlan,
    });

    const page = await upsertLinkPage(link.id, parsedBody.data);
    await setLinkPageEnabledForUser({
      enabled: true,
      id: link.id,
      userId: authResult.userId,
    });
    await cacheDelete(getRedirectCacheKey(link.slug));

    return successResponse(
      {
        linkId: link.id,
        linkPage: formatLinkPage(page),
      },
      201,
    );
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/links/[id]/page" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to save Link Page.",
      500,
      requestId,
    );
  }
}
