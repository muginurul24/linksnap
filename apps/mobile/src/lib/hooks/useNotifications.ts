import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { settingsApi } from "@/lib/api/settings";
import { useAppStore } from "@/lib/stores/app-store";

type InAppNotification = {
  body?: string;
  title?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowAlert: false,
  }),
});

function routeFromPayload(data: Record<string, unknown> | undefined): string | null {
  if (!data) return null;
  if (data.type === "link_milestone" && typeof data.linkId === "string") return `/link/${data.linkId}/analytics`;
  if (data.type === "campaign_ending" && typeof data.campaignId === "string") return `/campaign/${data.campaignId}`;
  if (data.type === "billing_expiring") return "/billing";
  if (data.type === "new_sign_in") return "/settings/security";
  return null;
}

export function useNotifications(): { banner: InAppNotification | null; clearBanner: () => void; register: () => Promise<void> } {
  const [banner, setBanner] = useState<InAppNotification | null>(null);
  const setPushToken = useAppStore((state) => state.setPushToken);

  const register = async (): Promise<void> => {
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.status === "granted" ? existing : await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return;
    const token = await Notifications.getExpoPushTokenAsync();
    setPushToken(token.data);
    await settingsApi.devices(token.data);
  };

  useEffect(() => {
    const foreground = Notifications.addNotificationReceivedListener((notification) => {
      setBanner({
        body: notification.request.content.body,
        title: notification.request.content.title,
      });
    });
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const route = routeFromPayload(event.notification.request.content.data);
      if (route) router.push(route);
    });

    return () => {
      foreground.remove();
      response.remove();
    };
  }, []);

  return { banner, clearBanner: () => setBanner(null), register };
}
