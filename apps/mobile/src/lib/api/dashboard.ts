import { apiClient } from "./client";
import type { DashboardOverview } from "@/types";

export const dashboardApi = {
  overview: () => apiClient.get<DashboardOverview>("/dashboard/overview"),
};
