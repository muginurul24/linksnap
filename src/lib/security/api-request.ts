import { hasApiKeyBearerAuthorization } from "@/lib/auth/api-key-format";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CUSTOM_HEADER_EXEMPT_PATHS = new Set(["/api/v1/payments/webhook"]);

export const API_CSRF_HEADER = "x-requested-with";
export const API_CSRF_HEADER_VALUE = "XMLHttpRequest";

export type ApiSecurityErrorCode = "CSRF_HEADER_REQUIRED" | "FORBIDDEN_ORIGIN";

export type ApiSecurityError = {
  code: ApiSecurityErrorCode;
  message: string;
};

type ApiSecurityInput = {
  authorization?: string | null;
  method: string;
  origin: string | null;
  pathname: string;
  requestedWith: string | null;
  allowedOrigins?: readonly string[];
};

export function getAllowedOrigins(): string[] {
  return uniqueOrigins([
    "https://justqiu.cloud",
    "https://www.justqiu.cloud",
    "https://linksnap.id",
    "https://www.linksnap.id",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
  ]);
}

export function validateApiMutationRequest({
  authorization,
  method,
  origin,
  pathname,
  requestedWith,
  allowedOrigins = getAllowedOrigins(),
}: ApiSecurityInput): ApiSecurityError | null {
  if (!pathname.startsWith("/api/v1/") || !MUTATING_METHODS.has(method)) {
    return null;
  }

  if (origin && !allowedOrigins.includes(origin)) {
    return {
      code: "FORBIDDEN_ORIGIN",
      message: "Request origin is not allowed.",
    };
  }

  if (
    !CUSTOM_HEADER_EXEMPT_PATHS.has(pathname) &&
    !hasApiKeyBearerAuthorization(authorization ?? null) &&
    requestedWith !== API_CSRF_HEADER_VALUE
  ) {
    return {
      code: "CSRF_HEADER_REQUIRED",
      message: "Missing required request header.",
    };
  }

  return null;
}

function uniqueOrigins(values: Array<string | undefined>): string[] {
  const origins = values.reduce<string[]>((acc, value) => {
    const origin = value?.trim();
    if (origin) acc.push(origin);
    return acc;
  }, []);

  return [...new Set(origins)];
}
