import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api/analytics";
import type { LinkAnalytics } from "@/types";

export function useLinkAnalytics(id: string | undefined, range: string) {
  return useQuery<LinkAnalytics>({
    enabled: Boolean(id),
    queryFn: () => analyticsApi.link(String(id), range),
    queryKey: ["link", id, "analytics", range],
    staleTime: 60_000,
  });
}
