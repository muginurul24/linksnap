import { NextResponse } from "next/server";

type ErrorDetails = Record<string, unknown> | unknown[] | string | number;

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function successResponse<T>(data?: T, status = 200): NextResponse {
  const body =
    data === undefined ? { success: true } : { success: true, data };

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
    { status },
  );
}
