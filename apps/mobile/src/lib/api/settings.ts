import { apiClient } from "./client";
import type { ApiKey, NotificationPreferences, User } from "@/types";

export const settingsApi = {
  apiKeys: () => apiClient.get<ApiKey[]>("/settings/api-keys"),
  createApiKey: (name: string) => apiClient.post<{ key: string; apiKey: ApiKey }>("/settings/api-keys", { name }),
  deleteApiKey: (id: string) => apiClient.delete<{ deleted: boolean }>(`/settings/api-keys/${id}`),
  devices: (pushToken: string) => apiClient.post<{ registered: boolean }>("/settings/devices", { pushToken }),
  notifications: () => apiClient.get<NotificationPreferences>("/settings/notifications"),
  profile: () => apiClient.get<User>("/settings/profile"),
  updateNotifications: (input: NotificationPreferences) => apiClient.patch<NotificationPreferences>("/settings/notifications", input),
  updatePassword: (input: { currentPassword: string; newPassword: string }) => apiClient.patch<{ updated: boolean }>("/settings/security/password", input),
  updateProfile: (input: { email: string; name: string }) => apiClient.patch<User>("/settings/profile", input),
};
