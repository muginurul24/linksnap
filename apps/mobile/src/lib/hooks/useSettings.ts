import { useMutation, useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import type { ApiKey, NotificationPreferences, User } from "@/types";

export function useProfile() {
  return useQuery<User>({
    queryFn: settingsApi.profile,
    queryKey: ["settings", "profile"],
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  return useMutation<User, { email: string; name: string }>({
    mutationFn: settingsApi.updateProfile,
  });
}

export function useApiKeys() {
  return useQuery<ApiKey[]>({
    queryFn: settingsApi.apiKeys,
    queryKey: ["settings", "api-keys"],
    staleTime: 60_000,
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryFn: settingsApi.notifications,
    queryKey: ["settings", "notifications"],
    staleTime: 60_000,
  });
}

export function useUpdateNotificationPreferences() {
  return useMutation<NotificationPreferences, NotificationPreferences>({
    mutationFn: settingsApi.updateNotifications,
  });
}
