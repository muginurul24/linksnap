import { getLinkQuota, type UserPlan } from "@/lib/links/limits";

export function getLinkCreateQuotaState({
  linkCount,
  userPlan,
}: {
  linkCount: number;
  userPlan: UserPlan;
}): { limit: number; used: number } {
  return {
    limit: getLinkQuota(userPlan),
    used: linkCount,
  };
}
