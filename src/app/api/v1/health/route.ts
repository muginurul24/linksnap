import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import { getHealthReport } from "@/lib/observability/health";

export const runtime = "nodejs";

export async function GET() {
  const requestId = createRequestId();

  try {
    const report = await getHealthReport();
    const response = successResponse(report, report.status === "ok" ? 200 : 503);
    response.headers.set("x-request-id", requestId);

    return response;
  } catch (error) {
    logApiErrorResponse({
      code: "INTERNAL_ERROR",
      error,
      requestId,
      route: "GET /api/v1/health",
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to evaluate service health.",
      500,
      requestId,
    );
  }
}
