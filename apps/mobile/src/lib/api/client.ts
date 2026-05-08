import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, API_PREFIX, SECURE_KEYS } from "@/lib/constants/api";
import type { ApiFailure, ApiResponse } from "@/types";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type ApiRequestOptions = {
  auth?: boolean;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  retry?: number;
  skipRefresh?: boolean;
};

type NormalizedError = {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  status: number;
};

export class ApiClientError extends Error {
  readonly details?: unknown;
  readonly requestId?: string;
  readonly status: number;

  constructor(error: NormalizedError) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = error.status;
    this.details = error.details;
    this.requestId = error.requestId;
  }
}

function normalizePath(path: string): string {
  if (path.startsWith("http")) return path;
  if (path.startsWith(API_PREFIX)) return path;
  if (path.startsWith("/api/")) return path;
  return `${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;
}

function buildUrl(path: string, query?: ApiRequestOptions["query"]): string {
  const normalizedPath = normalizePath(path);
  const url = normalizedPath.startsWith("http") ? new URL(normalizedPath) : new URL(normalizedPath, API_BASE_URL);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function normalizeError(response: Response, payload: unknown): NormalizedError {
  const fallback = {
    code: `HTTP_${response.status}`,
    message: response.status >= 500 ? "Something went wrong. Try again." : "Request failed.",
    status: response.status,
  };

  if (!payload || typeof payload !== "object") return fallback;

  const candidate = payload as Partial<ApiFailure>;
  if (candidate.success === false && candidate.error) {
    return {
      code: candidate.error.code,
      details: candidate.error.details,
      message: candidate.error.message,
      requestId: candidate.error.requestId,
      status: response.status,
    };
  }

  return fallback;
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
  if (!refreshToken) return null;

  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${refreshToken}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok) return null;
  const payload = await parseResponse<ApiResponse<{ token: string; refreshToken?: string }>>(response);
  if (!payload.success) return null;

  await SecureStore.setItemAsync(SECURE_KEYS.accessToken, payload.data.token);
  if (payload.data.refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, payload.data.refreshToken);
  }

  return payload.data.token;
}

async function request<T>(method: HttpMethod, path: string, options: ApiRequestOptions = {}): Promise<T> {
  const retry = options.retry ?? 3;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
    ...options.headers,
  };

  if (options.auth !== false) {
    const token = await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  for (let attempt = 0; attempt <= retry; attempt += 1) {
    const response = await fetch(buildUrl(path, options.query), {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method,
    });

    const payload = await parseResponse<ApiResponse<T> | unknown>(response);

    if (response.status === 401 && options.auth !== false && !options.skipRefresh) {
      const token = await refreshAccessToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        continue;
      }
    }

    if (response.ok) {
      if (payload && typeof payload === "object" && "success" in payload) {
        const apiPayload = payload as ApiResponse<T>;
        if (apiPayload.success) return apiPayload.data;
        throw new ApiClientError(normalizeError(response, apiPayload));
      }
      return payload as T;
    }

    if (response.status >= 500 && attempt < retry) {
      await delay(1000 * 2 ** attempt);
      continue;
    }

    throw new ApiClientError(normalizeError(response, payload));
  }

  throw new ApiClientError({ code: "NETWORK_ERROR", message: "Unable to reach LinkSnap.", status: 0 });
}

export const apiClient = {
  delete: <T>(path: string, options?: ApiRequestOptions) => request<T>("DELETE", path, options),
  get: <T>(path: string, options?: ApiRequestOptions) => request<T>("GET", path, options),
  patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => request<T>("PATCH", path, { ...options, body }),
  post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) => request<T>("POST", path, { ...options, body }),
};
