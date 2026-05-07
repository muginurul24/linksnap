import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { createRequestId, errorResponse } from "@/lib/api/response";
import { getClientIpFromHeaders } from "@/lib/analytics/ip";
import { findQrGenerationLinkBySlug } from "@/lib/db/queries/links";
import { hasReachedQrQuota } from "@/lib/links/limits";
import { isRedirectLinkAvailable } from "@/lib/links/redirect";
import { cacheGet, cacheSet } from "@/lib/redis";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import {
  linkSlugParamsSchema,
  type LinkSlugParams,
} from "@/lib/validations/link";
import { qrCodeQuerySchema, type QrCodeQuery } from "@/lib/validations/qr";

type QrRouteContext = {
  params: Promise<{ slug: string }>;
};

const QR_CACHE_TTL_SECONDS = 60 * 60 * 24;
const QR_RATE_LIMIT_PER_MINUTE = 120;

function getQueryParams(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}

function getBaseUrl(request: NextRequest): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configuredBaseUrl) return configuredBaseUrl.replace(/\/+$/, "");

  return request.nextUrl.origin;
}

function buildShortUrl(request: NextRequest, slug: string): string {
  return `${getBaseUrl(request)}/${slug}`;
}

export function getQrCodeCacheKey({
  format,
  size,
  slug,
}: LinkSlugParams & QrCodeQuery): string {
  return `qr:${slug}:${format}:${size}`;
}

async function parseParams(
  context: QrRouteContext,
  requestId: string,
): Promise<{ params: LinkSlugParams } | { response: Response }> {
  const parsed = linkSlugParamsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid QR slug.",
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
): { query: QrCodeQuery } | { response: Response } {
  const parsed = qrCodeQuerySchema.safeParse(getQueryParams(request));

  if (!parsed.success) {
    return {
      response: errorResponse(
        "VALIDATION_ERROR",
        "Invalid QR query.",
        400,
        requestId,
        parsed.error.flatten(),
      ),
    };
  }

  return { query: parsed.data };
}

async function rateLimitQrRequest(
  request: NextRequest,
  requestId: string,
): Promise<Response | null> {
  const ipAddress = getClientIpFromHeaders(request.headers) ?? "unknown";
  const rateLimit = await slidingWindowRateLimit({
    key: `api:qr:${ipAddress}`,
    limit: QR_RATE_LIMIT_PER_MINUTE,
    windowSeconds: 60,
  });

  if (!rateLimit.limited) return null;

  return errorResponse(
    "RATE_LIMITED",
    "Too many QR generation requests.",
    429,
    requestId,
    { retryAfter: rateLimit.retryAfter },
  );
}

async function generateQrBase64({
  format,
  size,
  value,
}: QrCodeQuery & { value: string }): Promise<string> {
  const options = {
    errorCorrectionLevel: "M" as const,
    margin: 1,
    width: size,
  };

  if (format === "svg") {
    const svg = await QRCode.toString(value, { ...options, type: "svg" });
    return Buffer.from(svg, "utf8").toString("base64");
  }

  const png = await QRCode.toBuffer(value, { ...options, type: "png" });
  return png.toString("base64");
}

function createQrResponse(base64: string, format: QrCodeQuery["format"]): Response {
  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "cache-control":
        `public, max-age=${QR_CACHE_TTL_SECONDS}, s-maxage=${QR_CACHE_TTL_SECONDS}`,
      "content-type": format === "svg" ? "image/svg+xml" : "image/png",
    },
  });
}

export async function GET(request: NextRequest, context: QrRouteContext) {
  const requestId = createRequestId();

  try {
    const rateLimitResponse = await rateLimitQrRequest(request, requestId);
    if (rateLimitResponse) return rateLimitResponse;

    const parsedParams = await parseParams(context, requestId);
    if ("response" in parsedParams) return parsedParams.response;

    const parsedQuery = parseQuery(request, requestId);
    if ("response" in parsedQuery) return parsedQuery.response;

    const link = await findQrGenerationLinkBySlug(parsedParams.params.slug);
    if (!link || !isRedirectLinkAvailable(link)) {
      return errorResponse("LINK_NOT_FOUND", "Link not found.", 404, requestId);
    }

    if (hasReachedQrQuota(link.userPlan, link.qrCodeCountBefore)) {
      return errorResponse(
        "QR_QUOTA_EXCEEDED",
        "QR code quota exceeded.",
        403,
        requestId,
      );
    }

    const cacheKey = getQrCodeCacheKey({
      ...parsedParams.params,
      ...parsedQuery.query,
    });
    const cached = await cacheGet<string>(cacheKey);
    if (cached) return createQrResponse(cached, parsedQuery.query.format);

    const base64 = await generateQrBase64({
      ...parsedQuery.query,
      value: buildShortUrl(request, link.slug),
    });
    await cacheSet(cacheKey, base64, QR_CACHE_TTL_SECONDS);

    return createQrResponse(base64, parsedQuery.query.format);
  } catch (error) {
    console.error("[GET /api/v1/qr/[slug]]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to generate QR code.",
      500,
      requestId,
    );
  }
}
