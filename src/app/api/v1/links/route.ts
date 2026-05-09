import { NextRequest } from "next/server";
import { authenticateApiKeyRequest } from "@/lib/auth/api-key";
import { getAuthenticatedRequestUser } from "@/lib/auth/request-user";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { buildShortUrl } from "@/lib/api/base-url";
import { invalidateLinkCreateCaches } from "@/lib/cache/invalidation";
import {
  createListMeta,
  parseCreatedAtCursorParam,
} from "@/lib/api/pagination";
import {
  countLinksByUserId,
  createLinkRecord,
  findLinkBySlug,
  isUniqueConstraintViolation,
  listLinksByUserId,
  type CreatedLink,
  type ListedLink,
} from "@/lib/db/queries/links";
import {
  canUseCustomSlug,
  getApiEndpointRateLimit,
  getLinkCreationRateLimit,
  hasReachedLinkQuota,
  type UserPlan,
} from "@/lib/links/limits";
import { hydrateRedirectClickCounts } from "@/lib/links/click-count-cache";
import { generateRandomSlug } from "@/lib/links/slug";
import type { CreatedAtCursor } from "@/lib/pagination/cursor";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  createLinkSchema,
  listLinksQuerySchema,
  type CreateLinkInput,
  type ListLinksQuery,
} from "@/lib/validations/link";

const MAX_SLUG_GENERATION_ATTEMPTS = 8;

class LinkSlugConflictError extends Error {
  constructor() {
    super("Link slug is already taken.");
  }
}

class LinkSlugGenerationError extends Error {
  constructor() {
    super("Unable to generate a unique link slug.");
  }
}

class CustomSlugPlanError extends Error {
  constructor() {
    super("Custom slugs require an upgraded plan.");
  }
}

class LinkQuotaExceededError extends Error {
  constructor() {
    super("Link quota exceeded.");
  }
}

function withShortUrl<T extends { slug: string }>(request: NextRequest, link: T) {
  return {
    ...link,
    shortUrl: buildShortUrl(request, link.slug),
  };
}

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

async function createLinkWithAvailableSlug({
  destinationUrl,
  requestedSlug,
  title,
  userId,
}: {
  destinationUrl: string;
  requestedSlug?: string;
  title?: string;
  userId: string;
}): Promise<CreatedLink> {
  const attempts = requestedSlug ? 1 : MAX_SLUG_GENERATION_ATTEMPTS;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const slug = requestedSlug ?? generateRandomSlug();
    const existing = await findLinkBySlug(slug);

    if (existing) {
      if (requestedSlug) throw new LinkSlugConflictError();
      continue;
    }

    try {
      return await createLinkRecord({ destinationUrl, slug, title, userId });
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;
      if (requestedSlug) throw new LinkSlugConflictError();
    }
  }

  throw new LinkSlugGenerationError();
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

  const requestUser = await getAuthenticatedRequestUser(request);
  if (!requestUser) {
    return {
      response: errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      ),
    };
  }

  return { userId: requestUser.userId, userPlan: requestUser.userPlan };
}

async function checkRateLimit({
  key,
  limit,
  requestId,
}: {
  key: string;
  limit: number;
  requestId: string;
}): Promise<Response | null> {
  const rateLimit = await slidingWindowRateLimit({
    key,
    limit,
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

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const body = await request.json().catch(() => null);
    const parsed = createLinkSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid link input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const rateLimitResponse = await checkRateLimit({
      key: `links:create:${authResult.userId}`,
      limit: getLinkCreationRateLimit(authResult.userPlan),
      requestId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const result = await createLink(
      parsed.data,
      authResult.userId,
      authResult.userPlan,
    );
    await invalidateLinkCreateCaches({
      reason: "link_create",
      requestId,
      userId: authResult.userId,
    });

    return successResponse(
      {
        ...result,
        shortUrl: buildShortUrl(request, result.slug),
      },
      201,
    );
  } catch (error) {
    if (error instanceof LinkSlugConflictError) {
      return errorResponse(
        "SLUG_ALREADY_EXISTS",
        "This slug is already taken.",
        409,
        requestId,
      );
    }

    if (error instanceof LinkSlugGenerationError) {
      return errorResponse(
        "SLUG_GENERATION_FAILED",
        "Unable to allocate a unique slug.",
        503,
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

    if (error instanceof LinkQuotaExceededError) {
      return errorResponse(
        "LINK_QUOTA_EXCEEDED",
        "Link quota exceeded.",
        403,
        requestId,
      );
    }

    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "POST /api/v1/links" });
    return errorResponse("INTERNAL_ERROR", "Unable to create link.", 500, requestId);
  }
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const authResult = await getAuthenticatedUser(request, requestId);
    if ("response" in authResult) return authResult.response;

    const parsed = listLinksQuerySchema.safeParse(getQueryParams(request));
    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid link list query.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const rateLimit = await checkRateLimit({
      key: `api:links:list:${authResult.userId}`,
      limit: getApiEndpointRateLimit(authResult.userPlan),
      requestId,
    });
    if (rateLimit) return rateLimit;

    const parsedCursor = parseCreatedAtCursorParam(
      parsed.data.cursor,
      requestId,
    );
    if ("response" in parsedCursor) return parsedCursor.response;

    const result = await listLinks(
      parsed.data,
      authResult.userId,
      parsedCursor.cursor,
    );
    const data = result.items.map((link) => withShortUrl(request, link));

    return successResponse(data, 200, {
      ...createListMeta({
        cursor: parsed.data.cursor,
        limit: parsed.data.limit,
        nextCursor: result.nextCursor,
        page: parsed.data.page,
        total: result.total,
      }),
    });
  } catch (error) {
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/links" });
    return errorResponse("INTERNAL_ERROR", "Unable to list links.", 500, requestId);
  }
}

async function createLink(
  input: CreateLinkInput,
  userId: string,
  userPlan: UserPlan,
): Promise<CreatedLink> {
  if (input.slug && !canUseCustomSlug(userPlan)) {
    throw new CustomSlugPlanError();
  }

  const linkCount = await countLinksByUserId(userId);
  if (hasReachedLinkQuota(userPlan, linkCount)) {
    throw new LinkQuotaExceededError();
  }

  return createLinkWithAvailableSlug({
    destinationUrl: input.destinationUrl,
    requestedSlug: input.slug,
    title: input.title,
    userId,
  });
}

async function listLinks(
  input: ListLinksQuery,
  userId: string,
  cursor?: CreatedAtCursor,
): Promise<{ items: ListedLink[]; nextCursor: string | null; total: number }> {
  const result = await listLinksByUserId({
    campaignId: input.campaignId,
    cursor,
    limit: input.limit,
    page: input.page,
    search: input.search,
    userId,
  });

  return {
    ...result,
    items: await hydrateRedirectClickCounts(result.items),
  };
}
