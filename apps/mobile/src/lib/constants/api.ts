import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof extra.EXPO_PUBLIC_API_URL === "string" ? extra.EXPO_PUBLIC_API_URL : undefined) ??
  "https://linksnap.id";

export const API_PREFIX = "/api/v1";

export const SECURE_KEYS = {
  accessToken: "linksnap.access-token",
  refreshToken: "linksnap.refresh-token",
  authState: "linksnap.auth-state",
  biometricEnabled: "linksnap.biometric-enabled",
  biometricFailures: "linksnap.biometric-failures",
} as const;

export const CACHE_KEYS = {
  mutationQueue: "linksnap.mutation-queue",
  queryCache: "linksnap.query-cache",
  appPrefs: "linksnap.app-prefs",
} as const;
