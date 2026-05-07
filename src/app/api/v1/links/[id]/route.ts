import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  findLinkById,
  findLinkBySlug,
  getUserPlanById,
  isUniqueConstraintViolation,
  softDeleteLinkForUser,
  updateLinkRecordForUser,
  type LinkDetail,
} from "@/lib/db/queries/links";
import {
  canUseCustomSlug,
  getApiEndpointRateLimit,
  type UserPlan,
} from "@/lib/links/limits";
import { getRedirectCacheKey } from "@/lib/links/redirect";
import { cacheDelete } from "@/lib/redis";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  linkIdParamsSchema,
  updateLinkSchema,
  type LinkIdParams,
  type UpdateLinkInput,
} from "@/lib/validations/link";

type LinkRouteContext = {
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

class LinkSlugConflictError extends Error {
  constructor() {
    super("Link slug is already taken.");
  }
}

class CustomSlugPlanError extends Error {
  constructor() {
    super("Custom slugs require an upgraded plan.");
  }
}

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

function getBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");

  return request.nextUrl.origin;
}

function buildShortUrl(request: NextRequest, slug: string): string {
  return `${getBaseUrl(request)}/${slug}`;
}

function formatLinkDetail(request: NextRequest, link: LinkDetail) {
  return {
    campaignId: link.campaignId,
    clickCount: link.clickCount,
    clickSummary: {
      totalClicks: link.clickCount,
    },
    createdAt: link.createdAt,
    destinationUrl: link.destinationUrl,
    expiresAt: link.expiresAt,
    hasLinkPage: link.hasLinkPage,
    id: link.id,
    isActive: link.isActive,
    scheduledAt: link.scheduledAt,
    shortUrl: buildShortUrl(request, link.slug),
    slug: link.slug,
    title: link.title,
    updatedAt: link.updatedAt,
  };
}

async function parseParams(
  context: LinkRouteContext,
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
    key: `api:links:item:${method.toLowerCase()}:${userId}`,
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

async function ensureSlugCanBeUsed({
  currentSlug,
  slug,
  userPlan,
}: {
  currentSlug: string;
  slug?: string;
  userPlan: UserPlan;
}): Promise<void> {
  if (!slug || slug === currentSlug) return;

  if (!canUseCustomSlug(userPlan)) throw new CustomSlugPlanError();

  const existing = await findLinkBySlug(slug);
  if (existing) throw new LinkSlugConflictError();
}

function handleKnownError(error: unknown, requestId: string): Response | null {
  if (error instanceof LinkNotFoundError) {
    return errorResponse("LINK_NOT_FOUND", "Link not found.", 404, requestId);
  }

  if (error instanceof LinkForbiddenError) {
    return errorResponse("FORBIDDEN", "You do not have access to this link.", 403, requestId);
  }

  if (error instanceof LinkSlugConflictError) {
    return errorResponse(
      "SLUG_ALREADY_EXISTS",
      "This slug is already taken.",
      409,
      requestId,
    );
  }

  if (error instanceof CustomSlugPlanError) {
    return errorResponse(
      "PLAN_UPGRADE_REQUIRED",
      "Custom slugs require an upgraded plan.",
      403,
      requestId,
    );
  }

  return null;
}

async function invalidateRedirectCaches(...slugs: string[]): Promise<void> {
  const uniqueSlugs = [...new Set(slugs)];
  await Promise.all(
    uniqueSlugs.map((slug) => cacheDelete(getRedirectCacheKey(slug))),
  );
}

export async function GET(request: NextRequest, context: LinkRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("GET", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const link = await getAuthorizedLink(parsedParams.params.id, authResult.userId);

    return successResponse(formatLinkDetail(request, link));
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links/[id]" });
    return errorResponse("INTERNAL_ERROR", "Unable to get link.", 500, requestId);
  }
}

export async function PATCH(request: NextRequest, context: LinkRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("PATCH", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const body = await request.json().catch(() => null);
    const parsedBody = updateLinkSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid link update input.",
        400,
        requestId,
        parsedBody.error.flatten(),
      );
    }

    const existingLink = await getAuthorizedLink(parsedParams.params.id, authResult.userId);
    const existingSlug = existingLink.slug;
    await ensureSlugCanBeUsed({
      currentSlug: existingSlug,
      slug: parsedBody.data.slug,
      userPlan: authResult.userPlan,
    });

    const updated = await updateLink(parsedParams.params.id, authResult.userId, parsedBody.data);
    if (!updated) throw new LinkNotFoundError();

    await invalidateRedirectCaches(existingSlug, updated.slug);

    return successResponse(formatLinkDetail(request, updated));
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return errorResponse(
        "SLUG_ALREADY_EXISTS",
        "This slug is already taken.",
        409,
        requestId,
      );
    }

    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "PATCH /api/v1/links/[id]" });
    return errorResponse("INTERNAL_ERROR", "Unable to update link.", 500, requestId);
  }
}

export async function DELETE(_request: NextRequest, context: LinkRouteContext) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser("DELETE", requestId);
    if ("response" in authResult) return authResult.response;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const existingLink = await getAuthorizedLink(parsedParams.params.id, authResult.userId);

    const deleted = await softDeleteLinkForUser(parsedParams.params.id, authResult.userId);
    if (!deleted) throw new LinkNotFoundError();

    await invalidateRedirectCaches(existingLink.slug);

    return successResponse({ deleted: true, id: deleted.id });
  } catch (error) {
    const knownError = handleKnownError(error, requestId);
    if (knownError) return knownError;

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "DELETE /api/v1/links/[id]" });
    return errorResponse("INTERNAL_ERROR", "Unable to delete link.", 500, requestId);
  }
}

function updateLink(
  id: string,
  userId: string,
  input: UpdateLinkInput,
): Promise<LinkDetail | null> {
  return updateLinkRecordForUser({
    destinationUrl: input.destinationUrl,
    id,
    slug: input.slug,
    title: input.title,
    userId,
  });
}
