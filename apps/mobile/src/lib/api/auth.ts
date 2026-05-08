import { apiClient } from "./client";
import type { User } from "@/types";

export type AuthResult = {
  token: string;
  refreshToken?: string;
  user: User;
  requiresVerification?: boolean;
};

export const authApi = {
  forgotPassword: (email: string) => apiClient.post<{ sent: boolean }>("/auth/forgot-password", { email }, { auth: false }),
  login: (input: { email: string; password: string }) => apiClient.post<AuthResult>("/auth/login", input, { auth: false }),
  register: (input: { email: string; name: string; password: string }) => apiClient.post<AuthResult>("/auth/register", input, { auth: false }),
  resendOtp: (email: string) => apiClient.post<{ sent: boolean }>("/auth/resend-otp", { email }, { auth: false }),
  resetPassword: (input: { email: string; token: string; password: string }) => apiClient.post<{ reset: boolean }>("/auth/reset-password", input, { auth: false }),
  verifyEmail: (input: { email: string; otp: string }) => apiClient.post<AuthResult>("/auth/verify", input, { auth: false }),
};
