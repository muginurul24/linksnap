import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { resetTokens, users } from "@/lib/db/schema";
import { createRequestId, errorResponse, successResponse } from "@/lib/api/response";
import {
  generateResetToken,
  getResetTokenExpiresAt,
  hashResetToken,
} from "@/lib/auth/reset-token";
import { sendPasswordResetEmail } from "@/lib/email/auth-emails";
import { slidingWindowRateLimit } from "@/lib/redis/rate-limit";
import { siteConfig } from "@/lib/seo/metadata";
import { forgotPasswordSchema } from "@/lib/validations/auth";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    process.env.AUTH_URL?.trim().replace(/\/+$/, "") ||
    siteConfig.url
  );
}

function getResetUrl(token: string): string {
  const url = new URL("/reset-password", getAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await request.json().catch(() => null);
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid password reset input.",
        400,
        requestId,
        parsed.error.flatten(),
      );
    }

    const rateLimit = await slidingWindowRateLimit({
      key: `auth:forgot-password:${parsed.data.email}`,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (rateLimit.limited) {
      return errorResponse(
        "RATE_LIMITED",
        "Too many password reset requests.",
        429,
        requestId,
        { retryAfter: rateLimit.retryAfter },
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });

    if (!user) {
      return successResponse();
    }

    const now = new Date();
    const token = generateResetToken();

    await db
      .update(resetTokens)
      .set({ usedAt: now })
      .where(and(eq(resetTokens.userId, user.id), isNull(resetTokens.usedAt)));

    const [resetToken] = await db
      .insert(resetTokens)
      .values({
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: getResetTokenExpiresAt(now),
      })
      .returning({ id: resetTokens.id });

    try {
      await sendPasswordResetEmail({
        to: parsed.data.email,
        resetUrl: getResetUrl(token),
      });
    } catch (error) {
      await db
        .update(resetTokens)
        .set({ usedAt: new Date() })
        .where(eq(resetTokens.id, resetToken.id));
      throw error;
    }

    return successResponse();
  } catch (error) {
    console.error("[POST /api/v1/auth/forgot-password]", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Unable to request password reset.",
      500,
      requestId,
    );
  }
}
