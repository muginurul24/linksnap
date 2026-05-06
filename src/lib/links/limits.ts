import type { users } from "@/lib/db/schema";

export type UserPlan = typeof users.$inferSelect["plan"];

const LINK_QUOTAS: Record<UserPlan, number> = {
  FREE: 25,
  PRO: 500,
  BUSINESS: Number.POSITIVE_INFINITY,
};

const LINK_PAGE_QUOTAS: Record<UserPlan, number> = {
  FREE: 3,
  PRO: 50,
  BUSINESS: Number.POSITIVE_INFINITY,
};

const LINK_CREATION_RATE_LIMITS: Record<UserPlan, number> = {
  FREE: 10,
  PRO: 30,
  BUSINESS: 60,
};

const API_ENDPOINT_RATE_LIMITS: Record<UserPlan, number> = {
  FREE: 30,
  PRO: 60,
  BUSINESS: 120,
};

export function canUseCustomSlug(plan: UserPlan): boolean {
  return plan !== "FREE";
}

export function getLinkQuota(plan: UserPlan): number {
  return LINK_QUOTAS[plan];
}

export function getLinkPageQuota(plan: UserPlan): number {
  return LINK_PAGE_QUOTAS[plan];
}

export function getLinkCreationRateLimit(plan: UserPlan): number {
  return LINK_CREATION_RATE_LIMITS[plan];
}

export function getApiEndpointRateLimit(plan: UserPlan): number {
  return API_ENDPOINT_RATE_LIMITS[plan];
}

export function hasReachedLinkQuota(plan: UserPlan, linkCount: number): boolean {
  return linkCount >= getLinkQuota(plan);
}

export function hasReachedLinkPageQuota(
  plan: UserPlan,
  linkPageCount: number,
): boolean {
  return linkPageCount >= getLinkPageQuota(plan);
}
