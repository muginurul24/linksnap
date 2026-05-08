import {
  API_CSRF_HEADER,
  API_CSRF_HEADER_VALUE,
} from "@/lib/security/api-request";

type ApiSuccessPayload<T> = {
  data?: T;
  meta?: Record<string, unknown>;
  success: true;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    details?: unknown;
    message?: string;
    requestId?: string;
  };
  success: false;
};

type ApiPayload<T> = ApiSuccessPayload<T> | ApiErrorPayload;

const MUTATING_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

export class ApiClientError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly retryAfter: number | null;
  readonly status: number;

  constructor({
    code,
    details,
    message,
    requestId,
    retryAfter,
    status,
  }: {
    code: string;
    details?: unknown;
    message: string;
    requestId?: string | null;
    retryAfter?: number | null;
    status: number;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
    this.requestId = requestId ?? null;
    this.retryAfter = retryAfter ?? null;
    this.status = status;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

function getMethod(init?: RequestInit): string {
  return (init?.method ?? "GET").toUpperCase();
}

function retryAfterFromResponse(response: Response): number | null {
  const header = response.headers.get("retry-after");
  if (!header) return null;

  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds : null;
}

async function readJsonPayload<T>(response: Response): Promise<ApiPayload<T> | null> {
  try {
    return (await response.json()) as ApiPayload<T>;
  } catch {
    return null;
  }
}

export function withBrowserMutationHeaders(init: RequestInit = {}): RequestInit {
  const method = getMethod(init);
  const headers = new Headers(init.headers);

  if (MUTATING_METHODS.has(method)) {
    headers.set(API_CSRF_HEADER, API_CSRF_HEADER_VALUE);
  }

  return {
    ...init,
    headers,
    method,
  };
}

export function getFriendlyApiErrorMessage(error: unknown): string {
  if (!isApiClientError(error)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "AUTHENTICATION_REQUIRED":
      return "Your session has expired. Sign in again to continue.";
    case "CSRF_HEADER_REQUIRED":
      return "This action was blocked by browser security. Refresh the page and try again.";
    case "FORBIDDEN_ORIGIN":
      return "This request came from an untrusted origin. Refresh the page and try again.";
    case "RATE_LIMITED":
      return error.retryAfter
        ? `Too many attempts. Try again in ${error.retryAfter} seconds.`
        : "Too many attempts. Wait a moment and try again.";
    case "SUPERADMIN_REQUIRED":
      return "Your admin session is no longer authorized. Sign in again.";
    case "VALIDATION_ERROR":
      return error.message || "Check the highlighted fields and try again.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, withBrowserMutationHeaders(init));
  const payload = await readJsonPayload<T>(response);
  const requestId =
    payload?.success === false
      ? payload.error?.requestId
      : response.headers.get("x-request-id");

  if (!response.ok || payload?.success === false) {
    const apiError = payload?.success === false ? payload.error : undefined;

    throw new ApiClientError({
      code: apiError?.code ?? `HTTP_${response.status}`,
      details: apiError?.details,
      message:
        apiError?.message ??
        (response.statusText || "The request failed. Please try again."),
      requestId,
      retryAfter: retryAfterFromResponse(response),
      status: response.status,
    });
  }

  if (payload?.success === true) {
    return payload.data as T;
  }

  return payload as T;
}
