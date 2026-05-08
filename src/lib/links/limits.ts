import type { users } from "@/lib/db/schema";
import { isSuperAdmin } from "@/lib/auth/superadmin-utils";

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

const SMART_RULE_QUOTAS: Record<UserPlan, number> = {
  FREE: 2,
  PRO: 5,
  BUSINESS: Number.POSITIVE_INFINITY,
};

const CAMPAIGN_QUOTAS: Record<UserPlan, number> = {
  FREE: 1,
  PRO: 10,
  BUSINESS: Number.POSITIVE_INFINITY,
};

const QR_QUOTAS: Record<UserPlan, number> = {
  FREE: 10,
  PRO: 100,
  BUSINESS: 500,
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

/**
 * Resolve effective plan for a user, taking into account superadmin role.
 * Superadmins get BUSINESS-equivalent access regardless of their stored plan.
 */
export function resolveEffectivePlan(
  plan: UserPlan,
  role?: string | null,
): UserPlan {
  if (isSuperAdmin(role)) return "BUSINESS";
  return plan;
}

export function canUseCustomSlug(plan: UserPlan, role?: string | null): boolean {
  return resolveEffectivePlan(plan, role) !== "FREE";
}

export function getLinkQuota(plan: UserPlan, role?: string | null): number {
  return LINK_QUOTAS[resolveEffectivePlan(plan, role)];
}

export function getLinkPageQuota(plan: UserPlan, role?: string | null): number {
  return LINK_PAGE_QUOTAS[resolveEffectivePlan(plan, role)];
}

export function getSmartRuleQuota(plan: UserPlan, role?: string | null): number {
  return SMART_RULE_QUOTAS[resolveEffectivePlan(plan, role)];
}

export function getCampaignQuota(plan: UserPlan, role?: string | null): number {
  return CAMPAIGN_QUOTAS[resolveEffectivePlan(plan, role)];
}

export function getQrQuota(plan: UserPlan, role?: string | null): number {
  return QR_QUOTAS[resolveEffectivePlan(plan, role)];
}

export function getLinkCreationRateLimit(
  plan: UserPlan,
  role?: string | null,
): number {
  return LINK_CREATION_RATE_LIMITS[resolveEffectivePlan(plan, role)];
}

export function getApiEndpointRateLimit(
  plan: UserPlan,
  role?: string | null,
): number {
  return API_ENDPOINT_RATE_LIMITS[resolveEffectivePlan(plan, role)];
}

export function hasReachedLinkQuota(
  plan: UserPlan,
  linkCount: number,
  role?: string | null,
): boolean {
  return linkCount >= getLinkQuota(plan, role);
}

export function hasReachedLinkPageQuota(
  plan: UserPlan,
  linkPageCount: number,
  role?: string | null,
): boolean {
  return linkPageCount >= getLinkPageQuota(plan, role);
}

export function hasReachedCampaignQuota(
  plan: UserPlan,
  campaignCount: number,
  role?: string | null,
): boolean {
  return campaignCount >= getCampaignQuota(plan, role);
}

export function hasReachedQrQuota(
  plan: UserPlan,
  qrCount: number,
  role?: string | null,
): boolean {
  return qrCount >= getQrQuota(plan, role);
}

export function exceedsSmartRuleQuota(
  plan: UserPlan,
  smartRuleCount: number,
  role?: string | null,
): boolean {
  return smartRuleCount > getSmartRuleQuota(plan, role);
}
