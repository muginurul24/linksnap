import { getCampaignQuota, type UserPlan } from "@/lib/links/limits";

export function getCampaignCreateQuotaState({
  campaignCount,
  userPlan,
}: {
  campaignCount: number;
  userPlan: UserPlan;
}): { limit: number; used: number } {
  return {
    limit: getCampaignQuota(userPlan),
    used: campaignCount,
  };
}
