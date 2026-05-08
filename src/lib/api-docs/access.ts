import { isSuperAdmin } from "@/lib/auth/superadmin-utils";
import type { UserPlan } from "@/lib/links/limits";

export const API_DOCS_UPGRADE_URL = "/settings/billing?upgrade=api-docs";
export const API_DOCS_LOGIN_URL = "/login?callbackUrl=/docs";

export function getApiDocsPageRedirect({
  plan,
  role,
  userId,
}: {
  plan?: UserPlan | null;
  role?: string | null;
  userId: string | null;
}): string | null {
  if (!userId) return API_DOCS_LOGIN_URL;
  if (isSuperAdmin(role)) return null;
  if (!plan) return API_DOCS_LOGIN_URL;
  if (plan === "FREE") return API_DOCS_UPGRADE_URL;

  return null;
}

export function canAccessApiDocs(
  plan: UserPlan | null | undefined,
  role?: string | null,
): boolean {
  if (isSuperAdmin(role)) return true;
  return plan === "PRO" || plan === "BUSINESS";
}
