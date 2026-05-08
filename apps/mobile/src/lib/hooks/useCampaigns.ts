import { useMutation, useQuery } from "@tanstack/react-query";
import { campaignsApi } from "@/lib/api/campaigns";
import type { Campaign, LinkItem } from "@/types";

export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryFn: campaignsApi.list,
    queryKey: ["campaigns"],
    staleTime: 60_000,
  });
}

export function useCampaign(id: string | undefined) {
  return useQuery<Campaign>({
    enabled: Boolean(id),
    queryFn: () => campaignsApi.detail(String(id)),
    queryKey: ["campaign", id],
    staleTime: 60_000,
  });
}

export function useCampaignLinks(id: string | undefined) {
  return useQuery<LinkItem[]>({
    enabled: Boolean(id),
    queryFn: () => campaignsApi.links(String(id)),
    queryKey: ["campaign", id, "links"],
    staleTime: 60_000,
  });
}

export function useCreateCampaign() {
  return useMutation<Campaign, { description?: string; name: string; utmCampaign?: string; utmMedium?: string; utmSource?: string }>({
    mutationFn: campaignsApi.create,
  });
}
