import { useEffect } from "react";
import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useAppStore } from "@/lib/stores/app-store";

export function useOfflineSync(): void {
  const clearPendingMutation = useAppStore((state) => state.clearPendingMutation);
  const pendingMutations = useAppStore((state) => state.pendingMutations);
  const setOnline = useAppStore((state) => state.setOnline);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setOnline(online);
      onlineManager.setOnline(online);
    });

    return unsubscribe;
  }, [setOnline]);

  useEffect(() => {
    const sync = async (): Promise<void> => {
      const status = await NetInfo.fetch();
      if (!status.isConnected || status.isInternetReachable === false) return;

      for (const item of pendingMutations) {
        if (item.method === "POST") await apiClient.post(item.path, item.body);
        if (item.method === "PATCH") await apiClient.patch(item.path, item.body);
        if (item.method === "DELETE") await apiClient.delete(item.path);
        clearPendingMutation(item.id);
      }
    };

    void sync();
  }, [clearPendingMutation, pendingMutations]);
}
