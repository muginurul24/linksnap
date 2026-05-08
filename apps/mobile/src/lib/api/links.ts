import { apiClient } from "./client";
import type { LinkItem } from "@/types";

export type LinkListParams = {
  campaignId?: string;
  filter?: string;
  page?: number;
  search?: string;
  sort?: string;
};

export type CreateLinkInput = {
  customSlug?: string;
  destinationUrl: string;
  hasLinkPage?: boolean;
  title?: string;
};

export type UpdateLinkInput = CreateLinkInput & {
  smartRules?: Array<{ type: string; condition: Record<string, unknown>; destinationUrl: string; priority: number }>;
};

export const linksApi = {
  create: (input: CreateLinkInput) => apiClient.post<LinkItem>("/links", input),
  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/links/${id}`),
  detail: (id: string) => apiClient.get<LinkItem>(`/links/${id}`),
  list: (params: LinkListParams = {}) => apiClient.get<LinkItem[]>("/links", { query: { limit: 20, ...params } }),
  linkPages: (params: { page?: number } = {}) => apiClient.get<LinkItem[]>("/links/pages", { query: params }),
  smartRules: (id: string) => apiClient.get<Array<{ id: string; type: string; destinationUrl: string }>>(`/links/${id}/rules`),
  update: (id: string, input: UpdateLinkInput) => apiClient.patch<LinkItem>(`/links/${id}`, input),
};
