import { NextResponse } from "next/server";
import { logger } from "@/lib/observability/logger";

type ErrorDetails = Record<string, unknown> | unknown[] | string | number;
type ResponseMeta = Record<string, unknown>;

type ApiErrorLogInput = {
  code: string;
  error: unknown;
  requestId: string;
  route: string;
  status?: number;
};

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function successResponse<T>(
  data?: T,
  status = 200,
  meta?: ResponseMeta,
): NextResponse {
  const body =
    data === undefined
      ? { success: true }
      : { success: true, data, ...(meta === undefined ? {} : { meta }) };

  return NextResponse.json(body, { status });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  requestId: string,
  details?: ErrorDetails,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        requestId,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status, headers: { "x-request-id": requestId } },
  );
}

export function logApiErrorResponse({
  code,
  error,
  requestId,
  route,
  status = 500,
}: ApiErrorLogInput): void {
  logger.error("api_error_response", {
    code,
    error,
    requestId,
    route,
    status,
  });
}
