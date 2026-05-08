import { auth } from "@/lib/auth";
import { getSessionRole, getSessionUserId } from "@/lib/auth/session-helpers";
import { verifyMobileAccessToken } from "@/lib/auth/mobile-token";
import { findMobileSessionUserById } from "@/lib/db/queries/mobile-auth";
import { getUserPlanById } from "@/lib/db/queries/links";
import type { UserPlan } from "@/lib/links/limits";

export type AuthenticatedRequestUser = {
  role: string;
  source: "mobile" | "session";
  userId: string;
  userPlan: UserPlan;
};

function getBearerToken(request?: Request): string | null {
  const authorization = request?.headers.get("authorization");
  if (!authorization) return null;

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export async function getAuthenticatedRequestUser(
  request?: Request,
): Promise<AuthenticatedRequestUser | null> {
  const session = await auth();
  const sessionUserId = getSessionUserId(session);

  if (sessionUserId) {
    const userPlan = await getUserPlanById(sessionUserId);
    if (!userPlan) return null;

    return {
      role: getSessionRole(session) ?? "user",
      source: "session",
      userId: sessionUserId,
      userPlan,
    };
  }

  const bearerToken = getBearerToken(request);
  if (!bearerToken) return null;

  const payload = verifyMobileAccessToken(bearerToken);
  if (!payload) return null;

  const user = await findMobileSessionUserById(payload.sub);
  if (!user || user.deletedAt || user.email !== payload.email) return null;

  return {
    role: user.role,
    source: "mobile",
    userId: user.id,
    userPlan: user.plan,
  };
}
