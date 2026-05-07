import { auth } from "@/lib/auth";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { canAccessApiDocs } from "@/lib/api-docs/access";
import { createOpenApiSpec } from "@/lib/api-docs/spec";
import { findBillingUserById } from "@/lib/db/queries/payments";

type SessionWithUserId = {
  user?: {
    id?: unknown;
  } | null;
} | null;

function getSessionUserId(session: SessionWithUserId): string | null {
  return typeof session?.user?.id === "string" ? session.user.id : null;
}

export async function GET() {
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

    const billingUser = await findBillingUserById(userId);
    if (!canAccessApiDocs(billingUser?.plan)) {
      return errorResponse(
        "PLAN_UPGRADE_REQUIRED",
        "API documentation requires a Pro or Business plan.",
        403,
        requestId,
      );
    }

    return successResponse(createOpenApiSpec());
  } catch (error) {
    console.error("[GET /api/v1/docs]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to load API documentation.",
      500,
      requestId,
    );
  }
}
