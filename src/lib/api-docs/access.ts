import type { UserPlan } from "@/lib/links/limits";

export const API_DOCS_UPGRADE_URL = "/settings/billing?upgrade=api-docs";
export const API_DOCS_LOGIN_URL = "/login?callbackUrl=/docs";

export function getApiDocsPageRedirect({
  plan,
  userId,
}: {
  plan?: UserPlan | null;
  userId: string | null;
}): string | null {
  if (!userId) return API_DOCS_LOGIN_URL;
  if (!plan) return API_DOCS_LOGIN_URL;
  if (plan === "FREE") return API_DOCS_UPGRADE_URL;

  return null;
}

export function canAccessApiDocs(plan: UserPlan | null | undefined): boolean {
  return plan === "PRO" || plan === "BUSINESS";
}
