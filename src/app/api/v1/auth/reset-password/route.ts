import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { resetTokens, users } from "@/lib/db/schema";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import {
  hashResetToken,
  isResetTokenExpired,
} from "@/lib/auth/reset-token";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid password reset input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const tokenHash = hashResetToken(parsed.data.token);
    const resetToken = await db.query.resetTokens.findFirst({
      where: eq(resetTokens.tokenHash, tokenHash),
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      isResetTokenExpired(resetToken.expiresAt)
    ) {
      return errorResponse(
        "INVALID_RESET_TOKEN",
        "Reset link is invalid or expired.",
        400,
        requestId,
      );
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const now = new Date();

    await db
      .update(users)
      .set({
        passwordHash,
        refreshTokenHash: null,
        updatedAt: now,
      })
      .where(eq(users.id, resetToken.userId));

    await db
      .update(resetTokens)
      .set({ usedAt: now })
      .where(eq(resetTokens.id, resetToken.id));

    return successResponse();
  } catch (error) {
    console.error("[POST /api/v1/auth/reset-password]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to reset password.",
      500,
      requestId,
    );
  }
}
