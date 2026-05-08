import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AuthLayout(): JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) router.replace("/");
  }, [isAuthenticated]);

  return (
    <Stack
      screenOptions={{
        gestureEnabled: true,
        headerShown: false,
      }}
    />
  );
}
