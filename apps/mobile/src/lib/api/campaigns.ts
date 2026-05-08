import { apiClient } from "./client";
import type { Campaign, LinkItem } from "@/types";

export const campaignsApi = {
  addLinks: (id: string, linkIds: string[]) => apiClient.post<{ added: boolean }>(`/campaigns/${id}/links`, { linkIds }),
  create: (input: { description?: string; name: string; utmCampaign?: string; utmMedium?: string; utmSource?: string }) =>
    apiClient.post<Campaign>("/campaigns", input),
  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/campaigns/${id}`),
  detail: (id: string) => apiClient.get<Campaign>(`/campaigns/${id}`),
  links: (id: string) => apiClient.get<LinkItem[]>(`/campaigns/${id}/links`),
  list: () => apiClient.get<Campaign[]>("/campaigns"),
  update: (id: string, input: Partial<Campaign>) => apiClient.patch<Campaign>(`/campaigns/${id}`, input),
};
