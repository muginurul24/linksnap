import { useEffect } from "react";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Slot, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Providers } from "@/providers";
import { useAuthStore } from "@/lib/stores/auth-store";

void SplashScreen.preventAutoHideAsync();

function routeDeepLink(url: string): void {
  const parsed = Linking.parse(url);
  const params = parsed.queryParams ?? {};

  if (parsed.path === "verify" && typeof params.email === "string") {
    const token = typeof params.token === "string" ? `&token=${params.token}` : "";
    router.push(`/verify?email=${encodeURIComponent(params.email)}${token}`);
  }

  if (parsed.path === "create" && typeof params.url === "string") {
    router.push(`/create?url=${encodeURIComponent(params.url)}`);
  }
}

export default function RootLayout(): JSX.Element | null {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    const subscription = Linking.addEventListener("url", (event) => routeDeepLink(event.url));
    void Linking.getInitialURL().then((url) => {
      if (url) routeDeepLink(url);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!fontsLoaded) return;
    void SplashScreen.hideAsync();

    const isAuthPath = pathname === "/login" || pathname === "/register" || pathname === "/verify";
    if (!isAuthenticated && !isAuthPath) router.replace("/login");
    if (isAuthenticated && isAuthPath) router.replace("/");
  }, [fontsLoaded, isAuthenticated, pathname]);

  if (!fontsLoaded) return null;

  return (
    <Providers>
      <StatusBar backgroundColor="transparent" style="light" translucent />
      <Slot />
    </Providers>
  );
}
