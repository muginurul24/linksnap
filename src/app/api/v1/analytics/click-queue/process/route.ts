import { NextRequest } from "next/server";
import {
  createRequestId,
  errorResponse,
  logApiErrorResponse,
  successResponse,
} from "@/lib/api/response";
import {
  processRedirectClickQueue,
  REDIRECT_CLICK_QUEUE_PROCESS_LIMIT,
} from "@/lib/analytics/click-queue";
import { invalidateClickQueueProcessingCaches } from "@/lib/cache/invalidation";
import {
  createMetricTimer,
  trackTimingMetric,
} from "@/lib/observability/instrumentation";

export const runtime = "nodejs";

function isAuthorizedCronRequest(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function getProcessLimit(request: NextRequest): number {
  const rawLimit = request.nextUrl.searchParams.get("limit");
  if (!rawLimit) return REDIRECT_CLICK_QUEUE_PROCESS_LIMIT;

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed)) return REDIRECT_CLICK_QUEUE_PROCESS_LIMIT;

  return Math.max(1, Math.min(parsed, 500));
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  const timer = createMetricTimer();

  try {
    if (!process.env.CRON_SECRET?.trim()) {
      return errorResponse(
        "CRON_CONFIGURATION_ERROR",
        "Cron secret is not configured.",
        503,
        requestId,
      );
    }

    if (!isAuthorizedCronRequest(request)) {
      return errorResponse(
        "UNAUTHORIZED",
        "Cron authorization is required.",
        401,
        requestId,
      );
    }

    const result = await processRedirectClickQueue({
      limit: getProcessLimit(request),
    });
    await invalidateClickQueueProcessingCaches({
      processed: result.processed,
      reason: "click_queue_processing",
      requestId,
    });
    trackTimingMetric({
      durationMs: timer.elapsedMs(),
      name: "click_queue.process",
      requestId,
      tags: {
        deadLettered: result.deadLettered,
        processed: result.processed,
        status: "success",
      },
    });

    return successResponse(result, 200);
  } catch (error) {
    trackTimingMetric({
      durationMs: timer.elapsedMs(),
      name: "click_queue.process",
      requestId,
      tags: { status: "error" },
    });
    logApiErrorResponse({ code: "INTERNAL_ERROR", error, requestId, route: "GET /api/v1/analytics/click-queue/process" });
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to process click queue.",
      500,
      requestId,
    );
  }
}
