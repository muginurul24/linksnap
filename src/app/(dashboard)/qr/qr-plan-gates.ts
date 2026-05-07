import { getQrQuota, type UserPlan } from "@/lib/links/limits";

export type QrQuotaLink = {
  createdAt: Date;
  id: string;
  isActive: boolean;
};

export function getQrDownloadQuotaState({
  link,
  links,
  userPlan,
}: {
  link: QrQuotaLink;
  links: readonly QrQuotaLink[];
  userPlan: UserPlan;
}): { limit: number; used: number } {
  return {
    limit: getQrQuota(userPlan),
    used: links.filter(
      (item) =>
        item.id !== link.id &&
        item.isActive &&
        item.createdAt.getTime() < link.createdAt.getTime(),
    ).length,
  };
}
