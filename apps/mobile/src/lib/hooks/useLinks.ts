import { useMutation, useQuery } from "@tanstack/react-query";
import { linksApi, type CreateLinkInput, type LinkListParams, type UpdateLinkInput } from "@/lib/api/links";
import type { LinkItem } from "@/types";

export function useLinks(params: LinkListParams = {}) {
  return useQuery<LinkItem[]>({
    queryFn: () => linksApi.list(params),
    queryKey: ["links", params],
    staleTime: 60_000,
  });
}

export function useLink(id: string | undefined) {
  return useQuery<LinkItem>({
    enabled: Boolean(id),
    queryFn: () => linksApi.detail(String(id)),
    queryKey: ["link", id],
    staleTime: 60_000,
  });
}

export function useCreateLink() {
  return useMutation<LinkItem, CreateLinkInput>({
    mutationFn: linksApi.create,
  });
}

export function useUpdateLink(id: string) {
  return useMutation<LinkItem, UpdateLinkInput>({
    mutationFn: (input: UpdateLinkInput) => linksApi.update(id, input),
  });
}
