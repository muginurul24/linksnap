import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { CACHE_KEYS } from "@/lib/constants/api";
import type { MutationQueueItem } from "@/types";

type AppState = {
  hapticsEnabled: boolean;
  isOnline: boolean;
  onboardingCompleted: boolean;
  pendingMutations: MutationQueueItem[];
  pushToken: string | null;
  themePreference: "system" | "dark";
  addPendingMutation: (item: MutationQueueItem) => void;
  clearPendingMutation: (id: string) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setOnline: (online: boolean) => void;
  setPushToken: (token: string | null) => void;
};

export const useAppStore = create<AppState>(
  persist(
    (set) => ({
      hapticsEnabled: true,
      isOnline: true,
      onboardingCompleted: false,
      pendingMutations: [],
      pushToken: null,
      themePreference: "dark",
      addPendingMutation: (item) => set((state) => ({ pendingMutations: [...state.pendingMutations, item] })),
      clearPendingMutation: (id) =>
        set((state) => ({ pendingMutations: state.pendingMutations.filter((item) => item.id !== id) })),
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      setOnline: (online) => set({ isOnline: online }),
      setPushToken: (token) => set({ pushToken: token }),
    }),
    {
      name: CACHE_KEYS.appPrefs,
      partialize: (state: AppState) => ({
        hapticsEnabled: state.hapticsEnabled,
        onboardingCompleted: state.onboardingCompleted,
        pushToken: state.pushToken,
        themePreference: state.themePreference,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
