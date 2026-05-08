import { apiClient } from "./client";
import type { LinkAnalytics } from "@/types";

export const analyticsApi = {
  campaign: (id: string, range = "30D") => apiClient.get<LinkAnalytics>(`/campaigns/${id}/analytics`, { query: { range } }),
  dashboard: () => apiClient.get<LinkAnalytics>("/analytics/overview"),
  link: (id: string, range = "30D") => apiClient.get<LinkAnalytics>(`/links/${id}/analytics`, { query: { range } }),
};
