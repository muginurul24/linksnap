import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { authApi } from "@/lib/api/auth";
import { SECURE_KEYS } from "@/lib/constants/api";
import type { User } from "@/types";

type AuthState = {
  isAuthenticated: boolean;
  isBiometricEnabled: boolean;
  isLoading: boolean;
  lastActiveAt: number | null;
  refreshToken: string | null;
  token: string | null;
  user: User | null;
  enableBiometric: (enabled: boolean) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<{ requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  register: (input: { email: string; name: string; password: string }) => Promise<{ requiresVerification?: boolean }>;
  requireBiometricUnlock: () => Promise<boolean>;
  verifyEmail: (input: { email: string; otp: string }) => Promise<void>;
};

const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
};

async function persistTokens(token: string | null, refreshToken?: string | null): Promise<void> {
  if (token) await SecureStore.setItemAsync(SECURE_KEYS.accessToken, token);
  else await SecureStore.deleteItemAsync(SECURE_KEYS.accessToken);

  if (refreshToken) await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, refreshToken);
  else if (refreshToken === null) await SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken);
}

function isExpired(lastActiveAt: number | null): boolean {
  if (!lastActiveAt) return false;
  return Date.now() - lastActiveAt > 7 * 24 * 60 * 60 * 1000;
}

export const useAuthStore = create<AuthState>(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isBiometricEnabled: false,
      isLoading: false,
      lastActiveAt: null,
      refreshToken: null,
      token: null,
      user: null,
      enableBiometric: async (enabled) => {
        await SecureStore.setItemAsync(SECURE_KEYS.biometricEnabled, enabled ? "true" : "false");
        set({ isBiometricEnabled: enabled });
      },
      login: async (input) => {
        set({ isLoading: true });
        const result = await authApi.login(input);
        await persistTokens(result.token, result.refreshToken ?? null);
        set({
          isAuthenticated: !result.requiresVerification,
          isLoading: false,
          lastActiveAt: Date.now(),
          refreshToken: result.refreshToken ?? null,
          token: result.token,
          user: result.user,
        });
        return { requiresVerification: result.requiresVerification };
      },
      logout: async () => {
        await persistTokens(null, null);
        await SecureStore.deleteItemAsync(SECURE_KEYS.authState);
        set({
          isAuthenticated: false,
          lastActiveAt: null,
          refreshToken: null,
          token: null,
          user: null,
        });
      },
      refreshSession: async () => {
        if (isExpired(get().lastActiveAt)) {
          await get().logout();
          return;
        }
        set({ lastActiveAt: Date.now() });
      },
      register: async (input) => {
        set({ isLoading: true });
        const result = await authApi.register(input);
        if (result.token) await persistTokens(result.token, result.refreshToken ?? null);
        set({
          isAuthenticated: !result.requiresVerification,
          isLoading: false,
          lastActiveAt: Date.now(),
          refreshToken: result.refreshToken ?? null,
          token: result.token,
          user: result.user,
        });
        return { requiresVerification: result.requiresVerification };
      },
      requireBiometricUnlock: async () => {
        if (!get().isBiometricEnabled) return true;
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !enrolled) return false;
        const failures = Number((await SecureStore.getItemAsync(SECURE_KEYS.biometricFailures)) ?? "0");
        if (failures >= 3) return false;
        const result = await LocalAuthentication.authenticateAsync({
          disableDeviceFallback: false,
          promptMessage: "Unlock LinkSnap",
        });
        if (result.success) {
          await SecureStore.setItemAsync(SECURE_KEYS.biometricFailures, "0");
          return true;
        }
        await SecureStore.setItemAsync(SECURE_KEYS.biometricFailures, String(failures + 1));
        return false;
      },
      verifyEmail: async (input) => {
        set({ isLoading: true });
        const result = await authApi.verifyEmail(input);
        await persistTokens(result.token, result.refreshToken ?? null);
        set({
          isAuthenticated: true,
          isLoading: false,
          lastActiveAt: Date.now(),
          refreshToken: result.refreshToken ?? null,
          token: result.token,
          user: result.user,
        });
      },
    }),
    {
      name: SECURE_KEYS.authState,
      partialize: (state: AuthState) => ({
        isAuthenticated: state.isAuthenticated,
        isBiometricEnabled: state.isBiometricEnabled,
        lastActiveAt: state.lastActiveAt,
        refreshToken: state.refreshToken,
        token: state.token,
        user: state.user,
      }),
      storage: createJSONStorage(() => secureStorage),
    },
  ),
);
