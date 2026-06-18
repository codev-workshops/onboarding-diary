import { apiClient } from "./client";
import type { DashboardResponse } from "./types";

export const dashboardApi = {
  get: async () => {
    const { data } = await apiClient.get<DashboardResponse>("/dashboard");
    return data;
  },
};
