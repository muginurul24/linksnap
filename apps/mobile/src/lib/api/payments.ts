import { apiClient } from "./client";
import type { PaymentHistoryItem, Plan, SubscriptionSummary } from "@/types";

export type CheckoutResult = {
  orderId: string;
  status: string;
  transactionId?: string;
  vaNumbers?: Array<{ bank: string; vaNumber: string }>;
};

export const paymentsApi = {
  checkout: (input: { plan: Exclude<Plan, "FREE">; duration: "monthly" | "yearly" }) =>
    apiClient.post<CheckoutResult>("/payments/create", input),
  createPayment: (input: { plan: Exclude<Plan, "FREE">; duration: "monthly" | "yearly" }) =>
    apiClient.post<CheckoutResult>("/payments/create", input),
  history: () => apiClient.get<PaymentHistoryItem[]>("/payments/history"),
  subscriptionStatus: () => apiClient.get<SubscriptionSummary>("/payments/subscription"),
  transaction: (orderId: string) => apiClient.get<CheckoutResult>(`/payments/${orderId}`),
};
