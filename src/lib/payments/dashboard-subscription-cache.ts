import { findBillingUserById } from "@/lib/db/queries/payments";
import type { UserPlan } from "@/lib/links/limits";
import { cacheGet, cacheSet } from "@/lib/redis";
import { syncSubscriptionStatusForUser } from "@/lib/payments/subscription";

export const DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS = 60;

export type DashboardSubscriptionSnapshot = {
  email: string | null;
  name: string | null;
  plan: UserPlan;
};

export function getDashboardSubscriptionCacheKey(userId: string): string {
  return `dashboard:subscription:${userId}`;
}

export async function getDashboardSubscriptionSnapshot(
  userId: string,
): Promise<DashboardSubscriptionSnapshot> {
  const cacheKey = getDashboardSubscriptionCacheKey(userId);
  const cached = await cacheGet<DashboardSubscriptionSnapshot>(cacheKey);
  if (cached) return cached;

  const subscriptionSnapshot = await syncSubscriptionStatusForUser(userId);
  const billingUser = await findBillingUserById(userId);
  const snapshot: DashboardSubscriptionSnapshot = {
    email: billingUser?.email ?? null,
    name: billingUser?.name ?? null,
    plan: billingUser?.plan ?? subscriptionSnapshot.plan,
  };

  await cacheSet(cacheKey, snapshot, DASHBOARD_SUBSCRIPTION_CACHE_TTL_SECONDS);

  return snapshot;
}
