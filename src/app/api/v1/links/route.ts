import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import {
  countLinksByUserId,
  createLinkRecord,
  findLinkBySlug,
  getUserPlanById,
  isUniqueConstraintViolation,
  type CreatedLink,
} from "@/lib/db/queries/links";
import {
  canUseCustomSlug,
  getLinkCreationRateLimit,
  hasReachedLinkQuota,
  type UserPlan,
} from "@/lib/links/limits";
import { generateRandomSlug } from "@/lib/links/slug";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { createLinkSchema, type CreateLinkInput } from "@/lib/validations/link";

const MAX_SLUG_GENERATION_ATTEMPTS = 8;

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

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

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const session = await auth();
    const userId = getSessionUserId(session);

    if (!userId) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authentication is required.",
        401,
        requestId,
      );
    }

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

    const userPlan = await getUserPlanById(userId);
    if (!userPlan) {
      return errorResponse(
        "AUTHENTICATION_REQUIRED",
        "Authenticated user no longer exists.",
        401,
        requestId,
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `links:create:${userId}`,
      limit: getLinkCreationRateLimit(userPlan),
      windowSeconds: 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many link creation attempts.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const result = await createLink(parsed.data, userId, userPlan);

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

    console.error("[POST /api/v1/links]", error);
    return errorResponse("INTERNAL_ERROR", "Unable to create link.", 500, requestId);
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
