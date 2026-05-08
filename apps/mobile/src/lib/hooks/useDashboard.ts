import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import type { DashboardOverview } from "@/types";

export function useDashboardOverview() {
  return useQuery<DashboardOverview>({
    queryFn: dashboardApi.overview,
    queryKey: ["dashboard", "overview"],
    staleTime: 30_000,
  });
}
