import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useAuth(): ReturnType<typeof useAuthStore> {
  const auth = useAuthStore();

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && auth.isAuthenticated) {
        void auth.refreshSession();
        void auth.requireBiometricUnlock();
      }
    });

    return () => subscription.remove();
  }, [auth]);

  return auth;
}
