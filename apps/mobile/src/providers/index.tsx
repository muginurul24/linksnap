import { useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CACHE_KEYS } from "@/lib/constants/api";
import { useOfflineSync } from "@/lib/hooks/useOfflineSync";
import { useAppStore } from "@/lib/stores/app-store";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

type ProvidersProps = {
  children: React.ReactNode;
};

function AppRuntime({ children }: ProvidersProps): JSX.Element {
  const isOnline = useAppStore((state) => state.isOnline);
  const pendingCount = useAppStore((state) => state.pendingMutations.length);
  useOfflineSync();

  return (
    <>
      <OfflineBanner pendingCount={pendingCount} visible={!isOnline} />
      {children}
    </>
  );
}

export function Providers({ children }: ProvidersProps): JSX.Element {
  const queryClient = useMemo(() => {
    const client = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: 1,
        },
        queries: {
          gcTime: 1000 * 60 * 60 * 24,
          networkMode: "offlineFirst",
          retry: 2,
          staleTime: 60_000,
        },
      },
    });

    persistQueryClient({
      buster: "linksnap-mobile-v1",
      persister: createAsyncStoragePersister({
        key: CACHE_KEYS.queryCache,
        storage: AsyncStorage,
      }),
      queryClient: client,
    });

    return client;
  }, []);

  return (
    <GestureHandlerRootView className="flex-1 bg-surface">
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppRuntime>{children}</AppRuntime>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
