import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";

type RedirectRateLimitKind = "cta" | "slug";

type RedirectRateLimitInput = {
  headers: Headers;
  kind: RedirectRateLimitKind;
};

type RedirectRateLimitAllowed = {
  limited: false;
};

type RedirectRateLimitBlocked = {
  limited: true;
  retryAfter: number;
};

export type RedirectRateLimitResult =
  | RedirectRateLimitAllowed
  | RedirectRateLimitBlocked;

const REDIRECT_RATE_LIMITS: Record<
  RedirectRateLimitKind,
  { keyPrefix: string; limit: number; windowSeconds: number }
> = {
  cta: {
    keyPrefix: "redirect:cta",
    limit: 30,
    windowSeconds: 60,
  },
  slug: {
    keyPrefix: "redirect:slug",
    limit: 100,
    windowSeconds: 60,
  },
};

const KNOWN_BOT_USER_AGENT_PATTERN =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|applebot|linkedinbot|pinterestbot|semrushbot|ahrefsbot|gptbot|claude-web|ccbot/i;

const CLIENT_IP_HEADERS = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
  "x-vercel-forwarded-for",
] as const;

export function isKnownBotUserAgent(userAgent: string | null): boolean {
  return Boolean(userAgent && KNOWN_BOT_USER_AGENT_PATTERN.test(userAgent));
}

export function getRedirectRateLimitClientKey(headers: Headers): string {
  for (const header of CLIENT_IP_HEADERS) {
    const value = headers.get(header)?.split(",")[0]?.trim();
    if (value) return value;
  }

  return "unknown";
}

export function createRedirectRateLimitResponse(
  result: RedirectRateLimitBlocked,
): Response {
  return Response.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many redirect requests. Try again later.",
      },
    },
    {
      headers: {
        "Retry-After": String(result.retryAfter),
      },
      status: 429,
    },
  );
}

export async function checkRedirectRateLimit({
  headers,
  kind,
}: RedirectRateLimitInput): Promise<RedirectRateLimitResult> {
  if (isKnownBotUserAgent(headers.get("user-agent"))) {
    return { limited: false };
  }

  const config = REDIRECT_RATE_LIMITS[kind];
  const clientKey = getRedirectRateLimitClientKey(headers);
  const result = await slidingWindowRateLimit({
    key: `${config.keyPrefix}:${clientKey}`,
    limit: config.limit,
    windowSeconds: config.windowSeconds,
  });

  return result.limited
    ? { limited: true, retryAfter: result.retryAfter }
    : { limited: false };
}
